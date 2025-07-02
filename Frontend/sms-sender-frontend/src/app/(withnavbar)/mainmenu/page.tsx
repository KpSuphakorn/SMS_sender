'use client'
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, FileText, Search } from "lucide-react";

const menuItems = [
  { 
    label: "DASHBOARD", 
    path: "/dashboard",
    icon: LayoutDashboard,
    color: "from-blue-500 to-blue-600",
    hoverColor: "hover:border-blue-200",
    textColor: "group-hover:text-blue-700",
    roles: ["admin"], // Only admin can see
  },
  { 
    label: "หนังสือตรวจรออนุมัติ", 
    path: "/support-letter",
    icon: FileText,
    color: "from-purple-500 to-purple-600",
    hoverColor: "hover:border-purple-200",
    textColor: "group-hover:text-purple-700",
    roles: ["admin"], // Only admin can see
  },
  { 
    label: "ค้นหาข้อมูลทั้งหมด", 
    path: "/all-data",
    icon: Search,
    color: "from-indigo-500 to-indigo-600",
    hoverColor: "hover:border-indigo-200",
    textColor: "group-hover:text-indigo-700",
    roles: ["admin", "user"], // Both can see
  },
];

export default function MainMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const filteredMenuItems = menuItems.filter(item => role && item.roles.includes(role));
  const isSingleItem = filteredMenuItems.length === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            เมนูหลัก
          </h1>
          <p className="text-slate-600 text-lg md:text-xl">
            เลือกเมนูที่ต้องการใช้งาน
          </p>
        </div>
        
        <div className={`grid gap-4 md:gap-6 ${
          isSingleItem 
            ? 'grid-cols-1 place-items-center' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredMenuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`group relative ${
                isSingleItem ? 'w-80 h-56' : 'h-40 md:h-48'
              } bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:scale-[1.02] hover:bg-white ${item.hoverColor} p-6`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
                <div className={`${
                  isSingleItem ? 'w-24 h-24' : 'w-16 h-16 md:w-20 md:h-20'
                } bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <item.icon className={`${
                    isSingleItem ? 'w-12 h-12' : 'w-8 h-8 md:w-10 md:h-10'
                  } text-white`} />
                </div>
                
                <span className={`${
                  isSingleItem ? 'text-lg md:text-xl lg:text-2xl' : 'text-sm md:text-base lg:text-lg'
                } font-semibold text-slate-700 ${item.textColor} transition-colors duration-300 leading-tight`}>
                  {item.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}