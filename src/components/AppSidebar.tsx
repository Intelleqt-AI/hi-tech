import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  ShoppingCart,
  Factory,
  Shield,
  Package,
  Users,
  TrendingUp,
  Settings,
  Building,
  LogOut,
  ChevronRight,
  HandCoins,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate, useLocation } from 'react-router-dom';

const AppSidebar = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  const menuItems = [
    { id: 'staff', label: 'Staff', icon: Users, path: '/staff' },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: HandCoins,
      items: [
        { id: 'general-payroll', label: 'General Payroll', path: '/payroll/general' },
        { id: 'weekend-payroll', label: 'Weekend Payroll', path: '/payroll/weekend' },
      ],
    },
    ...(isAdmin ? [{ id: 'approvals', label: 'Approvals', icon: ClipboardCheck, path: '/approvals' }] : []),
  ];

  const isActive = path => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = items => {
    return items.some(item => isActive(item.path));
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar w-64">
      <SidebarContent>
        <div className="p-4 flex justify-center">
          <img src="/lovable-uploads/1a80eea5-dc8d-4381-8ecd-105c4cd7f9ab.png" alt="Hitec Packaging" className="h-12 w-auto" />
        </div>
        <SidebarGroup>
          <SidebarGroupContent className="px-4 py-2">
            <SidebarMenu>
              {menuItems.map(item =>
                item.items ? (
                  <Collapsible key={item.id} asChild defaultOpen={isGroupActive(item.items)} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.label}>
                          <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                          <span className="font-medium">{item.label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-[1.65rem] border-l border-sidebar-border px-0">
                          {item.items.map(subItem => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => navigate(subItem.path)}
                                className={`w-full justify-start py-2 px-4 rounded-lg transition-all duration-200 cursor-pointer ${
                                  isActive(subItem.path)
                                    ? 'bg-white text-sidebar hover:bg-white hover:text-sidebar'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                }`}
                              >
                                <span>{subItem.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={`w-full justify-start py-3 px-4 pl-2 rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-white text-sidebar hover:bg-white hover:text-sidebar'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button onClick={signOut} variant="outline" className="w-full text-blue-800 justify-start">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
