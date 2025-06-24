"use client";
import { Calendar, CalendarDays, Hash, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendMenu() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const menuItems = [
    {
      id: "daily",
      title: "รายวัน",
      subtitle: "ส่งข้อมูลประจำวัน",
      icon: Calendar,
      color: "from-amber-400 to-orange-500",
      hoverColor: "from-amber-500 to-orange-600",
      route: "/send/daily"
    },
    {
      id: "monthly", 
      title: "รายเดือน",
      subtitle: "ส่งข้อมูลรายเดือน",
      icon: CalendarDays,
      color: "from-rose-400 to-pink-500",
      hoverColor: "from-rose-500 to-pink-600",
      route: "/send/monthly"
    },
    {
      id: "weekly",
      title: "รายสัปดาห์", 
      subtitle: "ส่งข้อมูลรายสัปดาห์",
      icon: Zap,
      color: "from-emerald-400 to-teal-500",
      hoverColor: "from-emerald-500 to-teal-600",
      route: "/send/weekly"
    },
    {
      id: "by-number",
      title: "รายหมายเลข",
      subtitle: "ส่งตามหมายเลข",
      icon: Hash,
      color: "from-blue-400 to-indigo-500", 
      hoverColor: "from-blue-500 to-indigo-600",
      route: "/send/by-number"
    }
  ];

  const handleNavigation = (route: string) => {
    router.push(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-5xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
            ส่งข้อมูล
          </h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto">
            เลือกประเภทข้อมูลที่ต้องการส่ง เพื่อความสะดวกและรวดเร็วในการจัดการ
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isHovered = hoveredCard === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.route)}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  group relative overflow-hidden rounded-3xl p-8 h-48 md:h-56
                  bg-gradient-to-br ${isHovered ? item.hoverColor : item.color}
                  shadow-xl hover:shadow-2xl
                  transform transition-all duration-300 ease-out
                  hover:scale-105 hover:-translate-y-2
                  border border-white/20
                  backdrop-blur-sm
                `}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10"></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                  <div className={`
                    mb-4 p-3 rounded-2xl bg-white/20 backdrop-blur-sm
                    transition-all duration-300
                    ${isHovered ? 'scale-110 bg-white/30' : ''}
                  `}>
                    <IconComponent className="w-8 h-8" strokeWidth={2.5} />
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-bold mb-2 text-center">
                    {item.title}
                  </h3>
                  
                  <p className={`
                    text-sm md:text-base opacity-90 text-center
                    transition-all duration-300
                    ${isHovered ? 'opacity-100 translate-y-0' : 'translate-y-1'}
                  `}>
                    {item.subtitle}
                  </p>
                </div>

                {/* Hover Effect Overlay */}
                <div className={`
                  absolute inset-0 bg-white/10 transition-opacity duration-300
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}></div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12">
          <p className="text-slate-500 text-sm">
            คลิกเพื่อเลือกประเภทข้อมูลที่ต้องการจัดส่ง
          </p>
        </div>
      </div>
    </div>
  );
}