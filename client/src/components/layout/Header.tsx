import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  BellIcon, 
  CheckIcon, 
  CalendarIcon, 
  TrophyIcon,
  LogOutIcon,
  UserIcon
} from "lucide-react";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [location, setLocation] = useLocation();
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  
  const navigation = [
    { name: "Dashboard", path: "/" },
    { name: "Tests", path: "/tests" },
    { name: "Leaderboard", path: "/leaderboard" },
    { name: "FAQ", path: "/faq" },
    { name: "Profile", path: "/profile" }
  ];

  // Sample notifications - in a real app these would come from the backend
  const notifications = [
    {
      id: 1,
      title: "New Math test available",
      description: "A new Algebra test has been added.",
      date: "Today",
      icon: <CalendarIcon className="h-4 w-4" />
    },
    {
      id: 2,
      title: "Completed daily streak!",
      description: "You've maintained your study streak for 3 days.",
      date: "Yesterday",
      icon: <CheckIcon className="h-4 w-4" />
    },
    {
      id: 3,
      title: "Achievement unlocked",
      description: "You've earned the 'Fast Learner' badge.",
      date: "2 days ago",
      icon: <TrophyIcon className="h-4 w-4" />
    }
  ];

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="material-icons text-primary">school</span>
          <h1 className="text-xl font-bold text-primary">TestPrep</h1>
        </div>
        
        {/* Mobile Header Right Icons */}
        <div className="flex items-center space-x-4 md:hidden">
          <SignedIn>
            <NotificationDropdown 
              id="mobile-notifications"
              notifications={notifications} 
            />
            
            {!isLoaded ? (
              <Skeleton className="w-8 h-8 rounded-full" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <div className="w-8 h-8 rounded-full border-2 border-primary bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                    {user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || "?"}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>प्रोफाइल</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut(() => setLocation("/sign-in"))}>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>साइन आउट</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SignedIn>
          
          <SignedOut>
            <Button variant="outline" size="sm" asChild>
              <Link href="/sign-in">साइन इन</Link>
            </Button>
          </SignedOut>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <SignedIn>
            {navigation.map((item) => (
              <Link 
                key={item.name} 
                href={item.path}
                className={location === item.path 
                  ? "font-medium text-primary" 
                  : "font-medium text-gray-500 hover:text-primary"
                }
              >
                {item.name}
              </Link>
            ))}
            
            <div className="flex items-center space-x-4">
              <NotificationDropdown 
                id="desktop-notifications"
                notifications={notifications} 
              />
              
              {!isLoaded ? (
                <Skeleton className="w-8 h-8 rounded-full" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <div className="w-8 h-8 rounded-full border-2 border-primary bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || "?"}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>प्रोफाइल</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut(() => setLocation("/sign-in"))}>
                      <LogOutIcon className="mr-2 h-4 w-4" />
                      <span>साइन आउट</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </SignedIn>
          
          <SignedOut>
            <Link href="/faq" className="font-medium text-gray-500 hover:text-primary">
              FAQ
            </Link>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/sign-in">साइन इन</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-up">रजिस्टर करें</Link>
              </Button>
            </div>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}

// Notification dropdown component
function NotificationDropdown({ 
  notifications,
  id
}: { 
  notifications: Array<{
    id: number;
    title: string;
    description: string;
    date: string;
    icon: React.ReactNode;
  }>,
  id: string
}) {
  const [open, setOpen] = useState(false);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative focus:outline-none" data-testid={id}>
        <BellIcon className="h-5 w-5 text-gray-600" />
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          <span className="text-xs text-gray-500">
            {notifications.length} new
          </span>
        </div>
        <DropdownMenuGroup>
          {notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="p-0 focus:bg-transparent">
              <div className="flex p-4 w-full hover:bg-gray-50 cursor-pointer">
                <div className="mr-3 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {notification.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <span className="text-xs text-gray-500">{notification.date}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{notification.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          {notifications.length === 0 && (
            <div className="py-6 text-center text-gray-500">
              <p>No new notifications</p>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
