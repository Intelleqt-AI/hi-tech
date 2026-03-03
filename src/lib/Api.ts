export const fetchEntries = async ({ date_from, date_to, selectedDate }) => {
  const body = selectedDate
    ? {
      clock_number: '',
      date: selectedDate,
      date_from: '',
      date_to: '',
      timezone: '',
      limit: 100,
      offset: 0,
    }
    : {
      clock_number: '',
      date: '',
      date_from,
      date_to,
      timezone: '',
      limit: 100,
      offset: 0,
    };

  try {
    const response = await api.post('api/entries', body);
    return response.data;
  } catch (error) {
    throw new Error('Network response was not ok');
  }
};

export const fetchHours = async ({ date_from, date_to }) => {
  const body = {
    date_from,
    date_to,
    timezone: 'UTC',
    limit: 100,
    offset: 0,
  };

  try {
    const response = await api.post('api/entries/hours', body);
    return response.data;
  } catch (error) {
    throw new Error('Network response was not ok');
  }
};


// ========================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const handleError = error => {
  throw new Error(error.response ? `HTTP error! status: ${error.response.status}` : error.message);
};

export const fetchData = async url => {
  if (!url) throw new Error('No URL provided');
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const downloadFile = async (url: string, filename: string) => {
  if (!url) throw new Error('No URL provided');
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    handleError(error);
  }
};

export const postData = async ({ url, data, config = {} }: { url: string; data?: any; config?: any }) => {
  if (!url) throw new Error('No post URL provided');

  try {
    const response = await api.post(url, data, config);
    return response.data; // + your 201 success body
  } catch (error) {
    // Axios errors carry status here
    throw error;
  }
};

// export const deleteData = async ({ url }) => {
//   if (!url) throw new Error('No URL provided');
//   try {
//     const response = await api.delete(url);
//     return response.data;
//   } catch (error) {
//     handleError(error);
//   }
// };

export const deleteData = async ({ url, data }) => {
  if (!url) throw new Error('No URL provided');

  try {
    const response = await api.delete(url, data ? { data } : undefined);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


export const putData = async ({ url, data }) => {
  if (!url) throw new Error('No put URL provided');
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const patchData = async ({ url, data }) => {
  if (!url) throw new Error('No patch URL provided');
  try {
    const response = await api.patch(url, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const loginUser = async ({ email, password }: { email: string; password: string }) => {
  try {
    const res = await api.post('users/token/', {
      email,
      password
    });
    return res.data; // { access, refresh }
  } catch (error: any) {
    throw error;
  }
};

export interface RegisterUserData {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}

export const registerUser = async (data: RegisterUserData) => {
  try {
    const res = await api.post('users/register/', data);
    return res.data;
  } catch (error: any) {
    throw error;
  }
};




export const refreshToken = async (refresh: string) => {
  const res = await api.post('users/token/refresh/', { refresh });
  return res.data; // { access }
};

api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    // If the request that failed WAS the refresh token request → logout immediately
    if (originalRequest.url.includes('users/token/refresh/')) {
      localStorage.clear();
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Handle expired access → try refresh ONCE
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem('refresh');
      if (!refresh) {
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const data = await refreshToken(refresh);
        const newAccess = data.access;

        localStorage.setItem('access', newAccess);
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;

        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails → logout gracefully
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
