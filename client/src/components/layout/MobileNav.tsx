import { Link, useLocation } from "wouter";

export default function MobileNav() {
  const [location] = useLocation();
  
  const navItems = [
    { name: "Dashboard", icon: "dashboard", path: "/" },
    { name: "Tests", icon: "assignment", path: "/tests" },
    { name: "Leaderboard", icon: "leaderboard", path: "/leaderboard" },
    { name: "FAQ", icon: "help_outline", path: "/faq" },
    { name: "Profile", icon: "person", path: "/profile" }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link 
            key={item.name}
            href={item.path}
            className={`bottom-nav-item flex flex-col items-center py-2 px-4 ${
              location === item.path ? "active" : "text-gray-500"
            }`}
          >
            <span className="material-icons">{item.icon}</span>
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
