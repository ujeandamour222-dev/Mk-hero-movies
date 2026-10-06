export interface ActiveVisitor {
  id: string;
  name: string;
  location: string;
  device: 'Mobile' | 'Desktop' | 'Tablet';
  page: string;
  contentTitle?: string;
  quality?: string;
  lastSeen: number; // timestamp
}

export interface VisitorAnalyticsStats {
  onlineCount: number;
  todayVisitorsCount: number;
  mobilePercentage: number;
  topLocation: string;
  visitors: ActiveVisitor[];
  recentActivities: { id: string; text: string; time: string }[];
}

const STORAGE_KEY_VISITORS = 'mk_active_visitors';
const STORAGE_KEY_TODAY_COUNT = 'mk_today_visitors';

const SAMPLE_LOCATIONS = ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Kayonza', 'Gicumbi', 'Nyagatare', 'Rusizi'];

export function initializeVisitorSession(userName?: string, pageName: string = 'home', contentTitle?: string, quality?: string): string {
  try {
    let visitorId = sessionStorage.getItem('mk_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('mk_visitor_id', visitorId);

      // Increment today's unique visitors count
      const today = new Date().toISOString().split('T')[0];
      const todayData = JSON.parse(localStorage.getItem(STORAGE_KEY_TODAY_COUNT) || '{}');
      if (todayData.date === today) {
        todayData.count = (todayData.count || 0) + 1;
      } else {
        todayData.date = today;
        todayData.count = 1;
      }
      localStorage.setItem(STORAGE_KEY_TODAY_COUNT, JSON.stringify(todayData));
    }

    sendVisitorHeartbeat(pageName, contentTitle, quality, userName);
    return visitorId;
  } catch {
    return 'vis_guest';
  }
}

export function sendVisitorHeartbeat(pageName: string, contentTitle?: string, quality?: string, userName?: string): void {
  try {
    const visitorId = sessionStorage.getItem('mk_visitor_id') || 'vis_' + Date.now();
    const raw = localStorage.getItem(STORAGE_KEY_VISITORS);
    let list: ActiveVisitor[] = raw ? JSON.parse(raw) : [];

    const now = Date.now();
    // Filter out expired sessions (> 3 minutes inactive)
    list = list.filter((v) => now - v.lastSeen < 3 * 60 * 1000);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const existingIdx = list.findIndex((v) => v.id === visitorId);

    const nameToUse = userName || (existingIdx >= 0 ? list[existingIdx].name : 'Umukoresha (Guest)');
    const locToUse = existingIdx >= 0 ? list[existingIdx].location : SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)];

    const updatedVisitor: ActiveVisitor = {
      id: visitorId,
      name: nameToUse,
      location: locToUse,
      device: isMobile ? 'Mobile' : 'Desktop',
      page: pageName,
      contentTitle,
      quality,
      lastSeen: now,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = updatedVisitor;
    } else {
      list.push(updatedVisitor);
    }

    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(list));
  } catch {}
}

export function getVisitorAnalytics(): VisitorAnalyticsStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITORS);
    let list: ActiveVisitor[] = raw ? JSON.parse(raw) : [];

    const now = Date.now();
    // Active online users within last 3 minutes (strict real sessions)
    list = list.filter((v) => now - v.lastSeen < 3 * 60 * 1000);

    const todayData = JSON.parse(localStorage.getItem(STORAGE_KEY_TODAY_COUNT) || '{}');
    const todayVisitorsCount = todayData.count || list.length;

    const mobileCount = list.filter((v) => v.device === 'Mobile').length;
    const mobilePercentage = list.length > 0 ? Math.round((mobileCount / list.length) * 100) : 0;

    // Determine top location from active users
    const locCounts: Record<string, number> = {};
    list.forEach((v) => {
      locCounts[v.location] = (locCounts[v.location] || 0) + 1;
    });
    let topLocation = list.length > 0 ? 'Kigali' : 'Nta Byafoneka';
    let maxLocCount = 0;
    Object.entries(locCounts).forEach(([loc, cnt]) => {
      if (cnt > maxLocCount) {
        maxLocCount = cnt;
        topLocation = loc;
      }
    });

    const recentActivities = list.map((v, i) => ({
      id: `act_${i}`,
      text: v.contentTitle
        ? `${v.name} (${v.location}) ari kureba "${v.contentTitle}" [${v.quality || '720p'}]`
        : `${v.name} (${v.location}) ari kuri page ya ${v.page.toUpperCase()}`,
      time: `${Math.floor((now - v.lastSeen) / 1000)}s ago`,
    }));

    return {
      onlineCount: list.length,
      todayVisitorsCount,
      mobilePercentage,
      topLocation,
      visitors: list,
      recentActivities,
    };
  } catch {
    return {
      onlineCount: 0,
      todayVisitorsCount: 0,
      mobilePercentage: 0,
      topLocation: 'Kigali',
      visitors: [],
      recentActivities: [],
    };
  }
}
