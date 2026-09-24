import React from 'react';
import { BookOpen, Clock, Rocket, Edit3 } from 'lucide-react';
import type { ContentStatus } from '../../types';

interface MetricsCardsProps {
  totalCount: number;
  pendingCount: number;
  publishedCount: number;
  draftCount: number;
  currentFilter: ContentStatus;
  onSelectFilter: (status: ContentStatus) => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  totalCount,
  pendingCount,
  publishedCount,
  draftCount,
  currentFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'all' as ContentStatus,
      label: 'TOTAL ITEMS',
      value: totalCount,
      icon: BookOpen,
      iconColor: 'text-[#9b9a97]',
      textColor: 'text-[#37352f]',
      borderActive: currentFilter === 'all' ? 'ring-2 ring-[#37352f]/20' : '',
    },
    {
      id: 'pending' as ContentStatus,
      label: 'AWAITING REVIEW',
      value: pendingCount,
      icon: Clock,
      iconColor: 'text-[#dd5b00]',
      textColor: 'text-[#dd5b00]',
      borderActive: currentFilter === 'pending' ? 'ring-2 ring-[#dd5b00]/30' : '',
    },
    {
      id: 'published' as ContentStatus,
      label: 'LIVE PUBLISHED',
      value: publishedCount,
      icon: Rocket,
      iconColor: 'text-[#5645d4]',
      textColor: 'text-[#5645d4]',
      borderActive: currentFilter === 'published' ? 'ring-2 ring-[#5645d4]/30' : '',
    },
    {
      id: 'draft' as ContentStatus,
      label: 'DRAFTING',
      value: draftCount,
      icon: Edit3,
      iconColor: 'text-[#5d5b54]',
      textColor: 'text-[#5d5b54]',
      borderActive: currentFilter === 'draft' ? 'ring-2 ring-[#5d5b54]/30' : '',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            id={`metric-card-${card.id}`}
            onClick={() => onSelectFilter(card.id)}
            className={`bg-[#fafaf9] hover:bg-[#f0eeec] p-3.5 rounded-xl shadow-2xs border border-[#e8e7e4] flex items-center justify-between transition-all cursor-pointer text-left ${card.borderActive}`}
          >
            <div>
              <span className="text-[11px] font-semibold text-[#9b9a97] uppercase tracking-wider block">
                {card.label}
              </span>
              <span className={`text-[20px] font-semibold tracking-tight ${card.textColor}`}>
                {card.value}
              </span>
            </div>
            <div className={`p-2 rounded-lg bg-white border border-[#f1efed] ${card.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
