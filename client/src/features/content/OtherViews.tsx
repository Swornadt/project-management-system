import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { ActiveNavKey, ContentItem } from '../../types';

interface OtherViewsProps {
  activeNav: ActiveNavKey;
  items: ContentItem[];
  onOpenContentPublishing: () => void;
  onSelectItem: (item: ContentItem) => void;
}

export const OtherViews: React.FC<OtherViewsProps> = ({
  activeNav,
  items,
  onOpenContentPublishing,
  onSelectItem,
}) => {
  if (activeNav === 'task-kanban-board') {
    const columns = [
      { id: 'draft', title: 'Drafting', count: items.filter((i) => i.status === 'draft').length, color: 'border-[#9b9a97]' },
      { id: 'pending', title: 'Review / Pending', count: items.filter((i) => i.status === 'pending').length, color: 'border-[#dd5b00]' },
      { id: 'approved', title: 'Approved', count: items.filter((i) => i.status === 'approved').length, color: 'border-[#1aae39]' },
      { id: 'published', title: 'Published', count: items.filter((i) => i.status === 'published').length, color: 'border-[#5645d4]' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#fafaf9] shadow-2xs flex items-center justify-center text-2xl border border-[#e8e7e4]">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">
                  Task Kanban Board
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0eeec] text-[#5d5b54]">
                  Workspace
                </span>
              </div>
              <p className="text-[14px] text-[#5d5b54] mt-0.5">
                Visual pipeline of publications, editorial reviews, and technical compliance tasks.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenContentPublishing}
            className="px-3.5 py-2 rounded-lg bg-[#5645d4] hover:bg-[#4534b3] text-white text-[13px] font-medium transition-colors self-start sm:self-center"
          >
            Go to Content Database
          </button>
        </div>

        {/* Kanban Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colItems = items.filter((it) => it.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-[#fafaf9] rounded-xl p-3 border border-[#e8e7e4] flex flex-col min-h-[420px]"
              >
                <div className={`flex items-center justify-between pb-2 mb-3 border-b-2 ${col.color}`}>
                  <span className="text-xs font-semibold text-[#37352f] uppercase tracking-wider">
                    {col.title}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0eeec] text-[#5d5b54]">
                    {colItems.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colItems.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => onSelectItem(card)}
                      className="bg-white p-3 rounded-lg border border-[#e8e7e4] hover:border-[#5645d4]/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-semibold text-[#37352f] group-hover:text-[#5645d4] line-clamp-2">
                        {card.title}
                      </div>
                      <div className="text-[11px] text-[#9b9a97] font-mono mt-1 truncate">
                        {card.slug}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f1efed] text-[11px]">
                        <span className="text-[#5d5b54] truncate">{card.projectName}</span>
                        <div className="flex items-center gap-1 text-[#9b9a97]">
                          <Clock className="w-3 h-3" />
                          <span>{card.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeNav === 'approvals-and-governance') {
    const pendingItems = items.filter((i) => i.status === 'pending');
    const approvedItems = items.filter((i) => i.status === 'approved');

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#fafaf9] shadow-2xs flex items-center justify-center text-2xl border border-[#e8e7e4]">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">
                  Approvals &amp; Governance
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0eeec] text-[#5d5b54]">
                  Compliance C2
                </span>
              </div>
              <p className="text-[14px] text-[#5d5b54] mt-0.5">
                Review sign-offs, legal compliance policies, and cryptographic hashes before live publication.
              </p>
            </div>
          </div>
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e4]">
            <span className="text-xs text-[#9b9a97] uppercase font-semibold">Awaiting Verification</span>
            <div className="text-2xl font-semibold text-[#dd5b00] mt-1">{pendingItems.length}</div>
            <span className="text-xs text-[#5d5b54]">Requires Senior Editor or CISO sign-off</span>
          </div>
          <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e4]">
            <span className="text-xs text-[#9b9a97] uppercase font-semibold">Approved for Push</span>
            <div className="text-2xl font-semibold text-[#1aae39] mt-1">{approvedItems.length}</div>
            <span className="text-xs text-[#5d5b54]">Scheduled for next CDN cache release</span>
          </div>
          <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e4]">
            <span className="text-xs text-[#9b9a97] uppercase font-semibold">SOC-2 Evidence Collector</span>
            <div className="text-2xl font-semibold text-[#5645d4] mt-1">100% Passed</div>
            <span className="text-xs text-[#1aae39] flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> All integrity checks clean
            </span>
          </div>
        </div>

        {/* Awaiting Review List */}
        <div className="bg-white rounded-xl border border-[#e8e7e4] overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-[#fafaf9] border-b border-[#e8e7e4] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#37352f] uppercase tracking-wider">
              Pending Authorization Queue ({pendingItems.length})
            </span>
          </div>
          <div className="divide-y divide-[#f1efed]">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="p-4 flex items-center justify-between hover:bg-[#f0f4f8] cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-[#37352f]">{item.title}</div>
                  <div className="text-xs text-[#9b9a97] font-mono mt-0.5">{item.slug}</div>
                  <div className="text-xs text-[#5d5b54] mt-1">
                    Submitted by {item.author.name} • {item.lastUpdated}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ffe8d4] text-[#dd5b00] hover:bg-[#fbd3b5] transition-colors"
                >
                  Review Document
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Executive Overview / Favorites
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#fafaf9] shadow-2xs flex items-center justify-center text-2xl border border-[#e8e7e4]">
          ⭐
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-semibold text-[#37352f] tracking-tight">
              {activeNav === 'executive-overview'
                ? 'Executive Overview'
                : activeNav === 'projects-and-roadmaps'
                ? 'Projects & Roadmaps'
                : 'Sprint Planner'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0eeec] text-[#5d5b54]">
              Favorites
            </span>
          </div>
          <p className="text-[14px] text-[#5d5b54] mt-0.5">
            Operational telemetry and team coordination for enterprise engineering and editorial pipelines.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#e8e7e4] shadow-2xs space-y-4">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#37352f]">
          <Sparkles className="w-5 h-5 text-[#5645d4]" />
          <span>Active Operations Pulse</span>
        </div>
        <p className="text-xs text-[#5d5b54] max-w-xl leading-relaxed">
          Acme Global Operations is synchronizing 28 publications across 4 core engineering domains.
          Content releases are staged across Enterprise Core CMS, Security &amp; Architecture, Design System Mobile, and Cloud Infrastructure.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onOpenContentPublishing}
            className="px-4 py-2 bg-[#5645d4] hover:bg-[#4534b3] text-white text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Content Publishing Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
