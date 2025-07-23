import React from 'react';
import { TelcoStats } from '../types';

interface StatsCardsProps {
  stats: TelcoStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'รายการทั้งหมด',
      value: stats.total,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500'
    },
    {
      title: 'ส่งข้อมูลแล้ว',
      value: stats.submitted,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500'
    },
    {
      title: 'รอดำเนินการ',
      value: stats.pending,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-500'
    },
    {
      title: 'มีเอกสารครบ',
      value: stats.withDocuments,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500'
    }
  ];

  const getIcon = (index: number) => {
    const icons = [
      // Total records icon
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" key={index}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>,
      // Submitted icon
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" key={index}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>,
      // Pending icon
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" key={index}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>,
      // With documents icon
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" key={index}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    ];
    return icons[index] || icons[0];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div 
          key={index}
          className={`${card.bgColor} p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-3xl font-bold ${card.color}`}>
                {card.value.toLocaleString()}
              </div>
              <div className="text-gray-600 text-sm font-medium mt-1">
                {card.title}
              </div>
            </div>
            <div className={`${card.iconColor}`}>
              {getIcon(index)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
