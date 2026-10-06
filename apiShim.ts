import { auth, db, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  increment,
} from 'firebase/firestore';

const originalFetch = window.fetch.bind(window);

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper for Firestore query execution with timeout resilience
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000, fallbackValue: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallbackValue);
}

// LocalStorage cache helpers
function getLocalCache(key: string, defaultValue: any = []) {
  try {
    const raw = localStorage.getItem(`mk_cache_${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalCache(key: string, data: any) {
  try {
    localStorage.setItem(`mk_cache_${key}`, JSON.stringify(data));
  } catch {}
}

function toSyntheticEmail(emailOrPhone: string): string {
  const clean = emailOrPhone.trim();
  if (clean.includes('@')) {
    return clean.toLowerCase();
  }
  const sanitized = clean.replace(/[^a-zA-Z0-9]/g, '');
  return `phone_${sanitized}@mkhero.internal`;
}

// Default categories if Firestore collection is empty on first load
const DEFAULT_CATEGORIES = [
  { id: 'cat_agasobanuye_action', name: 'Agasobanuye Action', slug: 'agasobanuye-action', description: 'Action movies dubbed in Kinyarwanda' },
  { id: 'cat_agasobanuye_drama', name: 'Agasobanuye Drama', slug: 'agasobanuye-drama', description: 'Drama movies dubbed in Kinyarwanda' },
  { id: 'cat_rwandan_local', name: 'Rwandan Local Films', slug: 'rwandan-local', description: 'Made in Rwanda movies and talent' },
  { id: 'cat_series_rwanda', name: 'Rwandan Series', slug: 'rwandan-series', description: 'Popular Rwandan TV series & web series' },
  { id: 'cat_comedy', name: 'Comedy', slug: 'comedy', description: 'Hilarious comedy movies and clips' },
  { id: 'cat_romance', name: 'Romance', slug: 'romance', description: 'Romantic films and love stories' },
  { id: 'cat_documentary', name: 'Documentaries', slug: 'documentaries', description: 'Rwandan culture and history documentaries' },
];

async function recomputeSeriesStats(seriesId: string) {
  if (!seriesId) return;
  try {
    const epSnap = await getDocs(
      query(collection(db, 'episodes'), where('seriesId', '==', seriesId))
    );
    const episodesList: any[] = [];
    const seasonsSet = new Set<number>();
    epSnap.forEach((epDoc) => {
      const data = epDoc.data();
      episodesList.push(data);
      if (data.seasonNumber) {
        seasonsSet.add(Number(data.seasonNumber));
      }
    });
    const totalEpisodes = episodesList.length;
    const seasonsCount = seasonsSet.size > 0 ? Math.max(...Array.from(seasonsSet)) : 1;
    await updateDoc(doc(db, 'series', seriesId), {
      totalEpisodes,
      seasonsCount,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to recompute series stats:', err);
  }
}

let isShimInstalled = false;

export function initApiShim() {
  if (isShimInstalled) return;
  isShimInstalled = true;

  const customFetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let urlStr = '';
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input instanceof Request) {
      urlStr = input.url;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }

    // Pass non-API calls (HTML, static assets, images) through to originalFetch
    if (!parsedUrl.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const path = parsedUrl.pathname;
    const method = (init?.method || 'GET').toUpperCase();

    // Parse JSON body if available
    let bodyData: any = null;
    if (init?.body && typeof init.body === 'string') {
      try {
        bodyData = JSON.parse(init.body);
      } catch {
        bodyData = null;
      }
    }

    try {
      // -------------------------------------------------------------
      // POST /api/upload (Bunny Stream for videos, Cloudinary for posters)
      // -------------------------------------------------------------
      if (path === '/api/upload' && method === 'POST') {
        let formData: FormData | null = null;
        if (init?.body instanceof FormData) {
          formData = init.body;
        } else if (input instanceof Request) {
          formData = await (input as Request).clone().formData().catch(() => null);
        }

        if (!formData) {
          return jsonResponse({ error: 'Invalid FormData payload' }, 400);
        }

        const videoFile = formData.get('video') as File | null;
        const posterFile = formData.get('poster') as File | null;

        if ((!videoFile || videoFile.size === 0) && (!posterFile || posterFile.size === 0)) {
          return jsonResponse({ error: 'No video or poster file provided' }, 400);
        }

        const BUNNY_LIBRARY_ID = '765469';
        const BUNNY_CDN_HOST = 'vz-89ac8b3e-1ac.b-cdn.net';
        const BUNNY_ACCESS_KEYS = [
          '01d72269-aab7-4340-a72cf84d06f4-82cd-4703',
          'acf38b6e-d27a-409a-992f802aa22a-7449-4f71',
        ];

        const fetchBunnyApi = async (url: string, initObj: RequestInit = {}): Promise<Response> => {
          let lastResponse: Response | null = null;
          for (const key of BUNNY_ACCESS_KEYS) {
            const headers = new Headers(initObj.headers || {});
            headers.set('AccessKey', key);
            const response = await originalFetch(url, { ...initObj, headers });
            if (response.status !== 401 && response.status !== 403) {
              return response;
            }
            lastResponse = response;
          }
          return lastResponse || new Response('Unauthorized', { status: 401 });
        };

        const uploadVideoToBunnyStream = async (file: File): Promise<string> => {
          // 1. Create Video
          const createRes = await fetchBunnyApi(
            `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: file.name || 'Untitled' }),
            }
          );

          if (!createRes.ok) {
            const errBody = await createRes.text().catch(() => '');
            throw new Error(`Kurema video kuri Bunny Stream byahemukiye (HTTP ${createRes.status}): ${errBody}`);
          }

          const createData = await createRes.json();
          const guid = createData.guid;
          if (!guid) {
            throw new Error('Bunny Stream ntiyatanze video GUID.');
          }

          // 2. Upload raw binary file bytes via PUT with XHR progress
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`);
            xhr.setRequestHeader('AccessKey', BUNNY_ACCESS_KEYS[0]);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / file.size) * 100);
                window.dispatchEvent(
                  new CustomEvent('mk-upload-progress', {
                    detail: {
                      progress,
                      bytesTransferred: e.loaded,
                      totalBytes: file.size,
                      fileType: 'video',
                      fileName: file.name,
                    },
                  })
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else if (xhr.status === 401 || xhr.status === 403) {
                const fallbackXhr = new XMLHttpRequest();
                fallbackXhr.open('PUT', `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`);
                fallbackXhr.setRequestHeader('AccessKey', BUNNY_ACCESS_KEYS[1]);

                fallbackXhr.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / file.size) * 100);
                    window.dispatchEvent(
                      new CustomEvent('mk-upload-progress', {
                        detail: {
                          progress,
                          bytesTransferred: e.loaded,
                          totalBytes: file.size,
                          fileType: 'video',
                          fileName: file.name,
                        },
                      })
                    );
                  }
                };

                fallbackXhr.onload = () => {
                  if (fallbackXhr.status >= 200 && fallbackXhr.status < 300) {
                    resolve();
                  } else {
                    reject(new Error(`Gupakira video kuri Bunny Stream byahemukiye (HTTP ${fallbackXhr.status})`));
                  }
                };
                fallbackXhr.onerror = () => reject(new Error('Network error during Bunny Stream video upload'));
                fallbackXhr.send(file);
              } else {
                reject(new Error(`Gupakira video kuri Bunny Stream byahemukiye (HTTP ${xhr.status})`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during Bunny Stream video upload'));
            xhr.send(file);
          });

          // 3. Poll transcoding status
          const startTime = Date.now();
          const MAX_POLL_TIME = 5 * 60 * 1000;

          while (Date.now() - startTime < MAX_POLL_TIME) {
            try {
              const statusRes = await fetchBunnyApi(
                `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`
              );
              if (statusRes.ok) {
                const videoInfo = await statusRes.json();
                if (videoInfo.status === 4 || videoInfo.status >= 4) {
                  break;
                }
                if (videoInfo.status === 3 || videoInfo.status === 5) {
                  throw new Error('Video transcoding ku ruganda rwa Bunny Stream byahemukiye.');
                }
              }
            } catch (err: any) {
              console.warn('Bunny status poll error:', err);
            }
            await new Promise((r) => setTimeout(r, 3000));
          }

          // 4. Return direct HLS playlist URL
          return `https://${BUNNY_CDN_HOST}/${guid}/playlist.m3u8`;
        };

        const uploadPosterToCloudinary = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const endpoint = `https://api.cloudinary.com/v1_1/apv9lhtz/image/upload`;
            const xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / file.size) * 100);
                window.dispatchEvent(
                  new CustomEvent('mk-upload-progress', {
                    detail: {
                      progress,
                      bytesTransferred: e.loaded,
                      totalBytes: file.size,
                      fileType: 'poster',
                      fileName: file.name,
                    },
                  })
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const res = JSON.parse(xhr.responseText);
                  resolve(res.secure_url || '');
                } catch {
                  reject(new Error('Invalid Cloudinary upload response'));
                }
              } else {
                let errDetail = `Cloudinary poster upload failed (HTTP ${xhr.status})`;
                try {
                  const res = JSON.parse(xhr.responseText);
                  if (res.error?.message) errDetail = res.error.message;
                } catch {}
                reject(new Error(errDetail));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during Cloudinary poster upload'));

            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', 'mkhero_2026');
            xhr.send(fd);
          });
        };

        let videoUrl = '';
        let posterUrl = '';

        try {
          const tasks: Promise<void>[] = [];
          if (videoFile && videoFile.size > 0) {
            tasks.push(uploadVideoToBunnyStream(videoFile).then((u) => { videoUrl = u; }));
          }
          if (posterFile && posterFile.size > 0) {
            tasks.push(uploadPosterToCloudinary(posterFile).then((u) => { posterUrl = u; }));
          }
          await Promise.all(tasks);
        } catch (err: any) {
          return jsonResponse({ error: err?.message || 'Upload failed' }, 500);
        }

        return jsonResponse({ videoUrl, posterUrl, message: 'Upload completed' }, 200);
      }

      // -------------------------------------------------------------
      // AUTH ROUTES
      // -------------------------------------------------------------

      // POST /api/auth/register
      if (path === '/api/auth/register' && method === 'POST') {
        const { name, emailOrPhone, password } = bodyData || {};
        if (!name || !emailOrPhone || !password) {
          return jsonResponse({ error: 'Name, emailOrPhone, and password required' }, 400);
        }

        const syntheticEmail = toSyntheticEmail(emailOrPhone);
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
        } catch (err: any) {
          let errorMsg = err?.message || 'Registration failed';
          if (err?.code === 'auth/email-already-in-use') {
            errorMsg = 'Account already exists. Please login instead.';
          }
          return jsonResponse({ error: errorMsg }, 400);
        }

        const uid = userCred.user.uid;
        const normalized = emailOrPhone.trim();
        const role = normalized.toLowerCase() === 'admin@mkhero.com' ? 'admin' : 'user';

        const userProfile = {
          id: uid,
          name: name.trim(),
          emailOrPhone: normalized,
          role,
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', uid), userProfile);
        } catch (e) {
          console.error('Firestore user save error:', e);
        }

        return jsonResponse({ message: 'Registered successfully', user: userProfile }, 201);
      }

      // POST /api/auth/login
      if (path === '/api/auth/login' && method === 'POST') {
        const { emailOrPhone, password } = bodyData || {};
        if (!emailOrPhone || !password) {
          return jsonResponse({ error: 'emailOrPhone and password required' }, 400);
        }

        const syntheticEmail = toSyntheticEmail(emailOrPhone);
        let userCred;
        try {
          userCred = await signInWithEmailAndPassword(auth, syntheticEmail, password);
        } catch (err: any) {
          return jsonResponse({ error: 'Invalid email/phone or password' }, 401);
        }

        const uid = userCred.user.uid;
        const userDocRef = doc(db, 'users', uid);
        let userProfile: any = null;

        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            userProfile = snap.data();
          }
        } catch (e) {
          console.error('Firestore user fetch error:', e);
        }

        if (!userProfile) {
          const normalized = emailOrPhone.trim();
          const role = normalized.toLowerCase() === 'admin@mkhero.com' ? 'admin' : 'user';
          userProfile = {
            id: uid,
            name: normalized,
            emailOrPhone: normalized,
            role,
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(userDocRef, userProfile);
          } catch {}
        }

        return jsonResponse({ message: 'Login successful', user: userProfile, token: uid }, 200);
      }

      // POST /api/auth/google
      if (path === '/api/auth/google' && method === 'POST') {
        const { uid, name, email } = bodyData || {};
        if (!uid) {
          return jsonResponse({ error: 'UID is required' }, 400);
        }

        const userDocRef = doc(db, 'users', uid);
        let userProfile: any = null;

        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            userProfile = snap.data();
          }
        } catch (e) {
          console.error('Google user doc fetch error:', e);
        }

        if (!userProfile) {
          const normalizedEmail = (email || '').trim().toLowerCase();
          const role = normalizedEmail === 'admin@mkhero.com' ? 'admin' : 'user';
          userProfile = {
            id: uid,
            name: name || 'Google User',
            emailOrPhone: normalizedEmail || 'google_user',
            role,
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(userDocRef, userProfile);
          } catch (e) {
            console.error('Google user profile write error:', e);
          }
        }

        return jsonResponse({ message: 'Google login successful', user: userProfile, token: uid }, 200);
      }

      // GET /api/users
      if (path === '/api/users' && method === 'GET') {
        const usersList: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'users'));
          snap.forEach((d) => usersList.push(d.data()));
        } catch (e) {
          console.warn('Users fetch error:', e);
        }
        return jsonResponse({ users: usersList }, 200);
      }

      // PUT /api/users/:id/role
      const userRoleMatch = path.match(/^\/api\/users\/([^/]+)\/role$/);
      if (userRoleMatch && method === 'PUT') {
        const userId = userRoleMatch[1];
        const { role } = bodyData || {};
        const userRef = doc(db, 'users', userId);
        try {
          await updateDoc(userRef, { role });
          const snap = await getDoc(userRef);
          return jsonResponse(snap.data() || { id: userId, role }, 200);
        } catch (e) {
          return jsonResponse({ id: userId, role }, 200);
        }
      }

      // -------------------------------------------------------------
      // SETTINGS
      // -------------------------------------------------------------
      if (path === '/api/settings' && method === 'GET') {
        const defaultSettings = {
          appName: 'MK HERO MOVIES',
          theme: 'dark',
          contactPhone: '+250780000000',
          maintenanceMode: false,
          updatedAt: new Date().toISOString(),
        };

        try {
          const snap = await getDoc(doc(db, 'settings', 'global'));
          if (snap.exists()) {
            return jsonResponse(snap.data(), 200);
          }
          await setDoc(doc(db, 'settings', 'global'), defaultSettings).catch(() => {});
        } catch (e) {
          console.warn('Settings fetch error:', e);
        }

        return jsonResponse(defaultSettings, 200);
      }

      if (path === '/api/settings' && method === 'PUT') {
        const updated = { ...(bodyData || {}), updatedAt: new Date().toISOString() };
        try {
          await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
        } catch {}
        return jsonResponse(updated, 200);
      }

      // -------------------------------------------------------------
      // PLANS & PAYMENTS
      // -------------------------------------------------------------
      if (path === '/api/plans' && method === 'GET') {
        const DEFAULT_PLANS = [
          {
            id: 'plan_daily',
            name: 'Umunsi Umo',
            price: 300,
            durationDays: 1,
            featured: false,
            features: ["Filme z'umunsi umwe", "HD Quality", "Nta Ads"],
          },
          {
            id: 'plan_weekly',
            name: 'Icyumweru',
            price: 500,
            durationDays: 7,
            featured: true,
            features: ["Filme z'icyumweru cyose", "Full HD Quality", "Download 5", "Priority Support"],
          },
          {
            id: 'plan_biweekly',
            name: 'Ibyumweru 2',
            price: 3000,
            durationDays: 14,
            featured: false,
            features: ["Access y'ibyumweru 2", "4K Quality", "Download zose", "24/7 Support"],
          },
        ];

        let plansList: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'plans'));
          snap.forEach((d) => plansList.push({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Plans fetch error:', e);
        }

        if (plansList.length === 0) {
          plansList = DEFAULT_PLANS;
        }

        return jsonResponse({ plans: plansList }, 200);
      }

      if (path === '/api/payments' && method === 'POST') {
        const { userId, phone, planName, amount, days, refCode, method: payMethod } = bodyData || {};
        const payId = 'pay_' + Date.now();
        const paymentObj = {
          id: payId,
          userId: userId || 'anonymous',
          phone: phone || '',
          planName: planName || 'Standard Plan',
          amount: Number(amount) || 0,
          days: Number(days) || 7,
          refCode: refCode || '',
          method: payMethod || 'momo',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'payments', payId), paymentObj);
        } catch (e) {
          console.error('Payment save error:', e);
        }

        return jsonResponse({ message: 'Payment submitted successfully', payment: paymentObj }, 201);
      }

      if (path === '/api/payments' && method === 'GET') {
        let paymentsList: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'payments'));
          snap.forEach((d) => paymentsList.push({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Payments fetch error:', e);
        }
        paymentsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return jsonResponse({ payments: paymentsList }, 200);
      }

      const singlePayMatch = path.match(/^\/api\/payments\/([^/]+)\/status$/);
      if (singlePayMatch && method === 'PUT') {
        const payId = singlePayMatch[1];
        const { status } = bodyData || {};
        const payRef = doc(db, 'payments', payId);
        try {
          await updateDoc(payRef, { status, updatedAt: new Date().toISOString() });
          const snap = await getDoc(payRef);
          const payData = snap.data();

          if (status === 'approved' && payData?.userId) {
            const expiresAt = new Date(Date.now() + (payData.days || 7) * 24 * 60 * 60 * 1000).toISOString();
            await setDoc(doc(db, 'users', payData.userId), {
              subscriptionStatus: 'active',
              subscriptionExpiresAt: expiresAt,
              isVip: true,
            }, { merge: true });
          }

          return jsonResponse({ message: `Payment ${status}`, payment: payData }, 200);
        } catch (e) {
          return jsonResponse({ error: 'Failed to update payment status' }, 500);
        }
      }

      // -------------------------------------------------------------
      // MOVIES ROUTES & SERVERS
      // -------------------------------------------------------------

      // GET /api/movies
      if (path === '/api/movies' && method === 'GET') {
        const categoryFilter = parsedUrl.searchParams.get('category');
        const genreFilter = parsedUrl.searchParams.get('genre');
        const yearFilter = parsedUrl.searchParams.get('year');
        const searchQuery = (parsedUrl.searchParams.get('search') || parsedUrl.searchParams.get('q') || '').toLowerCase().trim();

        let moviesList: any[] = [];
        try {
          const fetchPromise = (async () => {
            const list: any[] = [];
            const snap = await getDocs(collection(db, 'movies'));
            for (const docSnap of snap.docs) {
              const mData = docSnap.data();
              const mId = docSnap.id;
              let servers: any[] = mData.servers || [];
              list.push({
                id: mId,
                ...mData,
                servers: servers.length > 0 ? servers : (mData.videoUrl ? [{
                  id: 'srv_default',
                  serverName: 'Server 1 (Primary)',
                  serverUrl: mData.videoUrl,
                  quality: '720p',
                  type: 'direct',
                  downloadEnabled: !!mData.downloadUrl,
                  downloadUrl: mData.downloadUrl || ''
                }] : [])
              });
            }
            if (list.length > 0) setLocalCache('movies', list);
            return list;
          })();

          moviesList = await withTimeout(fetchPromise, 3500, getLocalCache('movies', []));
        } catch (e) {
          moviesList = getLocalCache('movies', []);
        }

        if (!moviesList || moviesList.length === 0) {
          moviesList = getLocalCache('movies', []);
        }

        // Apply filters
        if (categoryFilter) {
          moviesList = moviesList.filter((m) => m.category === categoryFilter || m.genre === categoryFilter);
        }
        if (genreFilter) {
          moviesList = moviesList.filter((m) => (m.genre || '').toLowerCase() === genreFilter.toLowerCase());
        }
        if (yearFilter) {
          moviesList = moviesList.filter((m) => String(m.year) === yearFilter);
        }
        if (searchQuery) {
          moviesList = moviesList.filter((m) => {
            const titleMatch = (m.title || '').toLowerCase().includes(searchQuery);
            const descMatch = (m.description || '').toLowerCase().includes(searchQuery);
            const genreMatch = (m.genre || '').toLowerCase().includes(searchQuery);
            const countryMatch = (m.country || '').toLowerCase().includes(searchQuery);
            const yearMatch = String(m.year || '').includes(searchQuery);
            return titleMatch || descMatch || genreMatch || countryMatch || yearMatch;
          });
        }

        return jsonResponse({ movies: moviesList }, 200);
      }

      // POST /api/movies
      if (path === '/api/movies' && method === 'POST') {
        const movieId = bodyData?.id || 'movie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const title = bodyData?.title || 'Untitled Movie';
        const slug = bodyData?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const newMovie = {
          id: movieId,
          title,
          slug,
          posterUrl: bodyData?.posterUrl || '',
          backdropUrl: bodyData?.backdropUrl || bodyData?.posterUrl || '',
          description: bodyData?.description || '',
          year: Number(bodyData?.year) || new Date().getFullYear(),
          genre: bodyData?.genre || bodyData?.category || 'Action',
          country: bodyData?.country || 'Rwanda',
          language: bodyData?.language || 'Kinyarwanda',
          duration: bodyData?.duration || '2h 15m',
          rating: bodyData?.rating || 'PG-13',
          featured: bodyData?.featured ?? true,
          trending: bodyData?.trending ?? false,
          status: bodyData?.status || 'published',
          videoUrl: bodyData?.videoUrl || '',
          downloadUrl: bodyData?.downloadUrl || '',
          servers: Array.isArray(bodyData?.servers) ? bodyData.servers : [],
          category: bodyData?.category || bodyData?.genre || 'Action',
          views: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'movies', movieId), newMovie);

        // Also save servers to subcollection for strict Firestore schema compliance
        if (Array.isArray(bodyData?.servers)) {
          for (const srv of bodyData.servers) {
            const srvId = srv.id || 'srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            await setDoc(doc(db, 'movies', movieId, 'servers', srvId), {
              ...srv,
              id: srvId,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }

        return jsonResponse({ message: 'Movie created', movie: newMovie }, 201);
      }

      // GET /api/movies/:id
      const singleMovieMatch = path.match(/^\/api\/movies\/([^/]+)$/);
      if (singleMovieMatch && method === 'GET') {
        const movieId = singleMovieMatch[1];
        const movieRef = doc(db, 'movies', movieId);
        const movieSnap = await getDoc(movieRef);

        if (!movieSnap.exists()) {
          return jsonResponse({ error: 'Movie not found' }, 404);
        }

        await updateDoc(movieRef, { views: increment(1) }).catch(() => {});

        const currentData = movieSnap.data();

        let servers: any[] = currentData.servers || [];
        try {
          const sSnap = await getDocs(collection(db, 'movies', movieId, 'servers'));
          if (!sSnap.empty) {
            servers = [];
            sSnap.forEach((s) => servers.push({ id: s.id, ...s.data() }));
          }
        } catch {}

        if (servers.length === 0 && currentData.videoUrl) {
          servers = [{
            id: 'srv_primary',
            serverName: 'Server 1 (Primary)',
            serverUrl: currentData.videoUrl,
            quality: '720p',
            type: 'direct',
            downloadEnabled: !!currentData.downloadUrl,
            downloadUrl: currentData.downloadUrl || ''
          }];
        }

        return jsonResponse({
          movie: {
            ...currentData,
            id: movieId,
            servers,
            views: (currentData.views || 0) + 1,
          }
        }, 200);
      }

      // PUT /api/movies/:id
      if (singleMovieMatch && method === 'PUT') {
        const movieId = singleMovieMatch[1];
        const movieRef = doc(db, 'movies', movieId);

        const title = bodyData?.title;
        const slug = bodyData?.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined);

        const updatePayload: any = {
          ...bodyData,
          updatedAt: new Date().toISOString(),
        };
        if (slug) updatePayload.slug = slug;

        await setDoc(movieRef, updatePayload, { merge: true });

        if (Array.isArray(bodyData?.servers)) {
          for (const srv of bodyData.servers) {
            const srvId = srv.id || 'srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            await setDoc(doc(db, 'movies', movieId, 'servers', srvId), {
              ...srv,
              id: srvId,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        }

        const updatedSnap = await getDoc(movieRef);
        return jsonResponse({ message: 'Movie updated', movie: updatedSnap.data() }, 200);
      }

      // DELETE /api/movies/:id
      if (singleMovieMatch && method === 'DELETE') {
        const movieId = singleMovieMatch[1];
        await deleteDoc(doc(db, 'movies', movieId));
        return jsonResponse({ message: 'Movie deleted successfully' }, 200);
      }

      // -------------------------------------------------------------
      // SERIES & EPISODES
      // -------------------------------------------------------------

      // GET /api/series
      if (path === '/api/series' && method === 'GET') {
        const categoryFilter = parsedUrl.searchParams.get('category');
        const searchQuery = (parsedUrl.searchParams.get('search') || parsedUrl.searchParams.get('q') || '').toLowerCase().trim();

        let seriesList: any[] = [];
        try {
          const seriesSnap = await getDocs(collection(db, 'series'));
          const epSnap = await getDocs(collection(db, 'episodes'));

          const allEps: any[] = [];
          epSnap.forEach((e) => allEps.push({ id: e.id, ...e.data() }));

          for (const docSnap of seriesSnap.docs) {
            const sData = docSnap.data();
            const sId = docSnap.id;
            const seriesEps = allEps.filter((e) => e.seriesId === sId);

            seriesEps.sort((a, b) => {
              if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
              return a.episodeNumber - b.episodeNumber;
            });

            seriesList.push({
              ...sData,
              id: sId,
              episodes: seriesEps,
              totalEpisodes: seriesEps.length,
            });
          }
        } catch (e) {
          console.warn('Series fetch error:', e);
        }

        if (categoryFilter) {
          seriesList = seriesList.filter((s) => s.category === categoryFilter || s.genre === categoryFilter);
        }
        if (searchQuery) {
          seriesList = seriesList.filter((s) => {
            const titleMatch = (s.title || '').toLowerCase().includes(searchQuery);
            const descMatch = (s.description || '').toLowerCase().includes(searchQuery);
            const genreMatch = (s.genre || '').toLowerCase().includes(searchQuery);
            return titleMatch || descMatch || genreMatch;
          });
        }

        return jsonResponse({ series: seriesList }, 200);
      }

      // POST /api/series
      if (path === '/api/series' && method === 'POST') {
        const seriesId = bodyData?.id || 'series_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const title = bodyData?.title || 'Untitled Series';
        const slug = bodyData?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const newSeries = {
          id: seriesId,
          title,
          slug,
          posterUrl: bodyData?.posterUrl || '',
          backdropUrl: bodyData?.backdropUrl || bodyData?.posterUrl || '',
          description: bodyData?.description || '',
          year: Number(bodyData?.year) || new Date().getFullYear(),
          genre: bodyData?.genre || bodyData?.category || 'Drama',
          country: bodyData?.country || 'Rwanda',
          language: bodyData?.language || 'Kinyarwanda',
          featured: bodyData?.featured ?? true,
          trending: bodyData?.trending ?? false,
          status: bodyData?.status || 'published',
          category: bodyData?.category || bodyData?.genre || 'Drama',
          seasonsCount: Number(bodyData?.seasonsCount) || 1,
          totalEpisodes: 0,
          views: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'series', seriesId), newSeries);
        return jsonResponse({ message: 'Series created', series: newSeries }, 201);
      }

      // GET /api/series/:id
      const singleSeriesMatch = path.match(/^\/api\/series\/([^/]+)$/);
      if (singleSeriesMatch && method === 'GET') {
        const seriesId = singleSeriesMatch[1];
        const seriesRef = doc(db, 'series', seriesId);
        const seriesSnap = await getDoc(seriesRef);

        if (!seriesSnap.exists()) {
          return jsonResponse({ error: 'Series not found' }, 404);
        }

        await updateDoc(seriesRef, { views: increment(1) }).catch(() => {});

        const epSnap = await getDocs(
          query(collection(db, 'episodes'), where('seriesId', '==', seriesId))
        );
        const episodes: any[] = [];
        epSnap.forEach((ep) => episodes.push({ id: ep.id, ...ep.data() }));

        episodes.sort((a, b) => {
          if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
          return a.episodeNumber - b.episodeNumber;
        });

        const sData = seriesSnap.data();
        return jsonResponse({
          series: {
            ...sData,
            id: seriesId,
            episodes,
            totalEpisodes: episodes.length,
            views: (sData.views || 0) + 1,
          }
        }, 200);
      }

      // PUT /api/series/:id
      if (singleSeriesMatch && method === 'PUT') {
        const seriesId = singleSeriesMatch[1];
        const seriesRef = doc(db, 'series', seriesId);
        await setDoc(seriesRef, { ...bodyData, updatedAt: new Date().toISOString() }, { merge: true });
        const updatedSnap = await getDoc(seriesRef);
        return jsonResponse({ message: 'Series updated', series: updatedSnap.data() }, 200);
      }

      // DELETE /api/series/:id
      if (singleSeriesMatch && method === 'DELETE') {
        const seriesId = singleSeriesMatch[1];
        await deleteDoc(doc(db, 'series', seriesId));

        const epSnap = await getDocs(
          query(collection(db, 'episodes'), where('seriesId', '==', seriesId))
        );
        const delTasks: Promise<void>[] = [];
        epSnap.forEach((ep) => delTasks.push(deleteDoc(ep.ref)));
        await Promise.all(delTasks);

        return jsonResponse({ message: 'Series deleted' }, 200);
      }

      // POST /api/episodes
      if (path === '/api/episodes' && method === 'POST') {
        const { seriesId, title, seasonNumber, episodeNumber, videoUrl, duration, thumbnailUrl, servers, downloadUrl } = bodyData || {};
        if (!seriesId) {
          return jsonResponse({ error: 'seriesId is required' }, 400);
        }

        const episodeId = bodyData?.id || 'ep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newEpisode = {
          id: episodeId,
          seriesId,
          seasonNumber: Number(seasonNumber) || 1,
          episodeNumber: Number(episodeNumber) || 1,
          title: title || `Episode ${episodeNumber || 1}`,
          description: bodyData?.description || '',
          thumbnailUrl: thumbnailUrl || '',
          duration: duration || '45m',
          videoUrl: videoUrl || '',
          servers: Array.isArray(servers) ? servers : (videoUrl ? [{
            id: 'srv_ep_1',
            serverName: 'Server 1',
            serverUrl: videoUrl,
            quality: '720p',
            type: 'direct',
            downloadEnabled: !!downloadUrl,
            downloadUrl: downloadUrl || ''
          }] : []),
          downloadUrl: downloadUrl || '',
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'episodes', episodeId), newEpisode);
        await recomputeSeriesStats(seriesId);

        return jsonResponse({ message: 'Episode saved', episode: newEpisode }, 201);
      }

      // DELETE /api/episodes/:id
      const singleEpMatch = path.match(/^\/api\/episodes\/([^/]+)$/);
      if (singleEpMatch && method === 'DELETE') {
        const epId = singleEpMatch[1];
        const epSnap = await getDoc(doc(db, 'episodes', epId));
        let parentSeriesId = '';
        if (epSnap.exists()) {
          parentSeriesId = epSnap.data().seriesId;
        }

        await deleteDoc(doc(db, 'episodes', epId));
        if (parentSeriesId) {
          await recomputeSeriesStats(parentSeriesId);
        }

        return jsonResponse({ message: 'Episode deleted' }, 200);
      }

      // -------------------------------------------------------------
      // CATEGORIES
      // -------------------------------------------------------------

      // GET /api/categories
      if (path === '/api/categories' && method === 'GET') {
        let catList: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'categories'));
          snap.forEach((d) => catList.push({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Categories fetch error:', e);
        }

        if (catList.length === 0) {
          catList = DEFAULT_CATEGORIES;
          for (const cat of DEFAULT_CATEGORIES) {
            setDoc(doc(db, 'categories', cat.id), cat).catch(() => {});
          }
        }

        return jsonResponse({ categories: catList }, 200);
      }

      // POST /api/categories
      if (path === '/api/categories' && method === 'POST') {
        const catId = bodyData?.id || 'cat_' + Date.now();
        const name = bodyData?.name || 'New Category';
        const slug = bodyData?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const category = {
          id: catId,
          name,
          slug,
          description: bodyData?.description || '',
        };
        await setDoc(doc(db, 'categories', catId), category);
        return jsonResponse({ message: 'Category created', category }, 201);
      }

      // DELETE /api/categories/:id
      const singleCatMatch = path.match(/^\/api\/categories\/([^/]+)$/);
      if (singleCatMatch && method === 'DELETE') {
        const catId = singleCatMatch[1];
        await deleteDoc(doc(db, 'categories', catId));
        return jsonResponse({ message: 'Category deleted' }, 200);
      }

      // -------------------------------------------------------------
      // FAVORITES & HISTORY
      // -------------------------------------------------------------

      const userFavMatch = path.match(/^\/api\/favorites\/([^/]+)$/);
      if (userFavMatch && method === 'GET') {
        const userId = userFavMatch[1];
        const snap = await getDocs(
          query(collection(db, 'favorites'), where('userId', '==', userId))
        );
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        return jsonResponse({ favorites: list }, 200);
      }

      if (path === '/api/favorites/toggle' && method === 'POST') {
        const { userId, contentId, contentType, title, posterUrl } = bodyData || {};
        if (!userId || !contentId) {
          return jsonResponse({ error: 'userId and contentId required' }, 400);
        }

        const favDocId = `${userId}_${contentId}`;
        const favRef = doc(db, 'favorites', favDocId);
        const snap = await getDoc(favRef);

        if (snap.exists()) {
          await deleteDoc(favRef);
          return jsonResponse({ favorited: false, message: 'Removed' }, 200);
        } else {
          const favoriteObj = {
            id: favDocId,
            userId,
            contentId,
            contentType: contentType || 'movie',
            title: title || '',
            posterUrl: posterUrl || '',
            createdAt: new Date().toISOString(),
          };
          await setDoc(favRef, favoriteObj);
          return jsonResponse({ favorited: true, favorite: favoriteObj, message: 'Added' }, 201);
        }
      }

      const userHistMatch = path.match(/^\/api\/history\/([^/]+)$/);
      if (userHistMatch && method === 'GET') {
        const userId = userHistMatch[1];
        const snap = await getDocs(
          query(collection(db, 'history'), where('userId', '==', userId))
        );
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return jsonResponse({ history: list }, 200);
      }

      if (path === '/api/history' && method === 'POST') {
        const { userId, contentId, contentType, title, posterUrl, progress, duration, lastPosition } = bodyData || {};
        if (!userId || !contentId) {
          return jsonResponse({ error: 'userId and contentId required' }, 400);
        }

        const histDocId = `${userId}_${contentId}`;
        const histRef = doc(db, 'history', histDocId);
        const historyItem = {
          id: histDocId,
          userId,
          contentId,
          contentType: contentType || 'movie',
          title: title || '',
          posterUrl: posterUrl || '',
          progress: Number(progress) || 0,
          duration: Number(duration) || 0,
          lastPosition: Number(lastPosition) || 0,
          updatedAt: new Date().toISOString(),
        };

        await setDoc(histRef, historyItem, { merge: true });
        return jsonResponse({ message: 'History saved', historyItem }, 200);
      }

      // Contact message endpoint
      if (path === '/api/contact' && method === 'POST') {
        const msgId = 'msg_' + Date.now();
        const contactObj = {
          id: msgId,
          ...(bodyData || {}),
          status: 'unread',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'contactMessages', msgId), contactObj);
        return jsonResponse({ message: 'Message sent successfully' }, 201);
      }

      // Ads endpoints
      if (path === '/api/ads' && method === 'GET') {
        let adsList: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'ads'));
          snap.forEach((d) => adsList.push({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Ads fetch warning:', e);
        }
        return jsonResponse({ ads: adsList }, 200);
      }

      if (path === '/api/ads' && method === 'POST') {
        const adId = bodyData?.id || 'ad_' + Date.now();
        const newAd = {
          id: adId,
          title: bodyData?.title || 'Amatangazo Mashya',
          type: bodyData?.type || 'midroll',
          mediaUrl: bodyData?.mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          targetUrl: bodyData?.targetUrl || 'https://mkhero.rw',
          position: bodyData?.position || 'center',
          startTime: Number(bodyData?.startTime) || 10,
          duration: Number(bodyData?.duration) || 8,
          enabled: bodyData?.enabled ?? true,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'ads', adId), newAd);
        return jsonResponse({ message: 'Ad created successfully', ad: newAd }, 201);
      }

      const singleAdMatch = path.match(/^\/api\/ads\/([^/]+)$/);
      if (singleAdMatch && method === 'PUT') {
        const adId = singleAdMatch[1];
        await setDoc(doc(db, 'ads', adId), { ...bodyData, updatedAt: new Date().toISOString() }, { merge: true });
        const snap = await getDoc(doc(db, 'ads', adId));
        return jsonResponse({ message: 'Ad updated', ad: snap.data() }, 200);
      }

      if (singleAdMatch && method === 'DELETE') {
        const adId = singleAdMatch[1];
        await deleteDoc(doc(db, 'ads', adId));
        return jsonResponse({ message: 'Ad deleted' }, 200);
      }

      if (path === '/api/ads/active' || path === '/api/ads/event') {
        return jsonResponse({ ad: null, success: true }, 200);
      }

      // Default JSON fallback for any unhandled /api/ path
      return jsonResponse({ error: 'Endpoint not found', path }, 404);
    } catch (err: any) {
      console.error('API Shim Exception:', err);
      return jsonResponse({ error: err?.message || 'Server error' }, 500);
    }
  };

  try {
    Object.defineProperty(window, 'fetch', {
      get() {
        return customFetch;
      },
      set(_val) {
        // no-op setter to prevent "Cannot set property fetch which has only a getter"
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    try {
      const proto = Object.getPrototypeOf(window) || Window.prototype;
      if (proto) {
        Object.defineProperty(proto, 'fetch', {
          get() {
            return customFetch;
          },
          set(_val) {},
          configurable: true,
          enumerable: true,
        });
      }
    } catch {
      try {
        Object.defineProperty(globalThis, 'fetch', {
          get() {
            return customFetch;
          },
          set(_val) {},
          configurable: true,
          enumerable: true,
        });
      } catch (e) {
        console.warn('Could not override fetch:', e);
      }
    }
  }
}

// Auto-initialize interceptor on import
initApiShim();
