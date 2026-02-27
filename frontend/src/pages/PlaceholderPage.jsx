import { Card, CardContent } from '@/components/ui/card';

const iconMap = {
  'Submissions': '01',
  'Calendar': '02',
  'Deliverables': '03',
  'Assets': '04',
  'Blog': '05',
  'Strategy Lab': '06',
  'AI Video Lab': '07',
  'Analytics': '08',
  'ROI Center': '09',
  'Billing': '10',
  'Settings': '11',
  'Help / Support': '12',
};

export default function PlaceholderPage({ title, description }) {
  return (
    <div data-testid={`page-${title?.toLowerCase().replace(/[\s/]+/g, '-')}`} className="page-enter">
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 rounded-sm bg-indigo-500/10 flex items-center justify-center mb-4">
            <span className="text-sm font-mono font-bold text-indigo-400">
              {iconMap[title] || '??'}
            </span>
          </div>
          <h2
            className="text-lg font-bold text-white mb-1"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {title}
          </h2>
          <p className="text-sm text-zinc-500 text-center max-w-md">
            {description || `The ${title} module is under development. This page will be built out in the next phase.`}
          </p>
          <div className="mt-4 px-3 py-1.5 rounded-sm bg-zinc-800/50 border border-zinc-700">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">TODO: Build Page</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
