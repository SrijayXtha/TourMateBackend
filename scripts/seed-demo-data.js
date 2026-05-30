const fs = require("fs");
const path = require("path");

const API_BASE = process.env.SEED_API_BASE || "http://127.0.0.1:4000";
const PASSWORD = "DemoPass123!";
const TODAY = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = (offsetDays) =>
  new Date(TODAY.getTime() + offsetDays * DAY_MS).toISOString().slice(0, 10);
const seedTag = `demo-${TODAY.toISOString()}`;

const outputPath = path.join(__dirname, "demo-seed-report.json");

const accounts = {
  admin: {
    label: "Admin",
    role: "admin",
    email: "admin.demo@tourmate.app",
    password: PASSWORD,
    fullName: "TourMate Demo Admin",
    username: "tourmateadmin",
    phone: "9800000000",
    profilePhoto:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
  },
  tourists: [
    {
      label: "Tourist Ava",
      role: "tourist",
      email: "tourist.ava@tourmate.app",
      password: PASSWORD,
      fullName: "Ava Sherpa",
      username: "ava_sherpa",
      phone: "9800000001",
      emergencyContact: "9811111111",
      preferences: ["Adventure", "Nature", "Cultural"],
      profilePhoto:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    },
    {
      label: "Tourist Liam",
      role: "tourist",
      email: "tourist.liam@tourmate.app",
      password: PASSWORD,
      fullName: "Liam Gurung",
      username: "liam_gurung",
      phone: "9800000002",
      emergencyContact: "9822222222",
      preferences: ["Historical", "Food", "Mountain"],
      profilePhoto:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    },
  ],
  guides: [
    {
      label: "Guide Maya",
      role: "guide",
      email: "guide.maya@tourmate.app",
      password: PASSWORD,
      fullName: "Maya Tamang",
      username: "maya_tamang",
      phone: "9800000011",
      specialization: "Heritage and Food Walks",
      experienceYears: "6",
      licenseDocument: {
        name: "maya-guide-license.pdf",
        uri: "https://example.com/docs/maya-guide-license.pdf",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
      bio: "Kathmandu Valley cultural guide with deep local food knowledge.",
      isAvailable: true,
    },
    {
      label: "Guide Suraj",
      role: "guide",
      email: "guide.suraj@tourmate.app",
      password: PASSWORD,
      fullName: "Suraj Thapa",
      username: "suraj_thapa",
      phone: "9800000012",
      specialization: "Trekking and Photography Tours",
      experienceYears: "8",
      licenseDocument: {
        name: "suraj-guide-license.pdf",
        uri: "https://example.com/docs/suraj-guide-license.pdf",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
      bio: "Outdoor guide focused on hill trails, viewpoints, and photo spots.",
      isAvailable: true,
    },
    {
      label: "Guide Rina",
      role: "guide",
      email: "guide.rina@tourmate.app",
      password: PASSWORD,
      fullName: "Rina Magar",
      username: "rina_magar",
      phone: "9800000013",
      specialization: "Spiritual and Temple Tours",
      experienceYears: "4",
      licenseDocument: {
        name: "rina-guide-license.pdf",
        uri: "https://example.com/docs/rina-guide-license.pdf",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
      bio: "Pilgrimage route guide for temples and meditation retreats.",
      isAvailable: false,
    },
  ],
  hotels: [
    {
      label: "Hotel Himalayan Haven",
      role: "hotel",
      email: "hotel.himalayan@tourmate.app",
      password: PASSWORD,
      fullName: "Himalayan Haven Hotel",
      username: "himalayan_haven",
      phone: "9800000021",
      businessName: "Himalayan Haven Hotel",
      registrationNumber: "HH-2026-001",
      hotelLicense: {
        name: "himalayan-license.pdf",
        uri: "https://example.com/docs/himalayan-license.pdf",
      },
      hotelLocation: {
        latitude: 27.7172,
        longitude: 85.324,
        address: "Thamel, Kathmandu, Nepal",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
      description: "Boutique city stay close to markets, nightlife, and heritage sites.",
      basePrice: 85,
      facilities: ["Free WiFi", "Airport Pickup", "Breakfast", "Rooftop Lounge"],
      images: [
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=900&q=80",
        "https://images.unsplash.com/photo-1455587734955-081b22074882?w=900&q=80",
      ],
      roomDetails: {
        standard: 12,
        deluxe: 6,
        suite: 2,
      },
    },
    {
      label: "Hotel Lakeside Retreat",
      role: "hotel",
      email: "hotel.lakeside@tourmate.app",
      password: PASSWORD,
      fullName: "Lakeside Retreat",
      username: "lakeside_retreat",
      phone: "9800000022",
      businessName: "Lakeside Retreat",
      registrationNumber: "LR-2026-002",
      hotelLicense: {
        name: "lakeside-license.pdf",
        uri: "https://example.com/docs/lakeside-license.pdf",
      },
      hotelLocation: {
        latitude: 28.2096,
        longitude: 83.9856,
        address: "Lakeside, Pokhara, Nepal",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
      description: "Lake-facing retreat with mountain views and quiet garden rooms.",
      basePrice: 110,
      facilities: ["Free WiFi", "Lake View", "Spa", "Restaurant"],
      images: [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80",
        "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=900&q=80",
      ],
      roomDetails: {
        standard: 10,
        deluxe: 8,
        family: 4,
      },
    },
    {
      label: "Hotel Valley View",
      role: "hotel",
      email: "hotel.valley@tourmate.app",
      password: PASSWORD,
      fullName: "Valley View Residency",
      username: "valley_view",
      phone: "9800000023",
      businessName: "Valley View Residency",
      registrationNumber: "VV-2026-003",
      hotelLicense: {
        name: "valley-license.pdf",
        uri: "https://example.com/docs/valley-license.pdf",
      },
      hotelLocation: {
        latitude: 27.6726,
        longitude: 85.4298,
        address: "Bhaktapur, Nepal",
      },
      profilePhoto:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80",
      description: "Quiet valley stay close to historic courtyards and temples.",
      basePrice: 72,
      facilities: ["Parking", "Breakfast", "Garden"],
      images: [
        "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=900&q=80",
      ],
      roomDetails: {
        standard: 14,
        deluxe: 4,
      },
    },
  ],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, endpoint, { token, body, expected = [200, 201] } = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!expected.includes(response.status)) {
    const error = new Error(
      `${method} ${endpoint} failed with ${response.status}: ${
        data?.message || data?.error || text || "Unknown error"
      }`
    );
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function waitForHealth() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await request("GET", "/health", { expected: [200] });
      return;
    } catch (error) {
      if (attempt === 20) {
        throw error;
      }
      await sleep(1500);
    }
  }
}

function authPayload(account) {
  const payload = {
    fullName: account.fullName,
    username: account.username,
    email: account.email,
    password: account.password,
    phone: account.phone,
    role: account.role,
    profilePhoto: account.profilePhoto,
  };

  if (account.role === "tourist") {
    payload.emergencyContact = account.emergencyContact;
    payload.preferences = account.preferences;
  }

  if (account.role === "guide") {
    payload.specialization = account.specialization;
    payload.experienceYears = account.experienceYears;
    payload.licenseDocument = account.licenseDocument;
  }

  if (account.role === "hotel") {
    payload.businessName = account.businessName;
    payload.registrationNumber = account.registrationNumber;
    payload.hotelLicense = account.hotelLicense;
    payload.hotelLocation = account.hotelLocation;
  }

  return payload;
}

function extractToken(payload) {
  return payload?.data?.token || payload?.token;
}

function extractUser(payload) {
  return payload?.data?.user || payload?.user;
}

async function ensureAccount(account) {
  let registered = false;

  try {
    await request("POST", "/auth/register", {
      body: authPayload(account),
      expected: [201],
    });
    registered = true;
  } catch (error) {
    if (error.status !== 409) {
      throw error;
    }
  }

  const loginResponse = await request("POST", "/auth/login", {
    body: {
      email: account.email,
      password: account.password,
    },
    expected: [200],
  });

  return {
    ...account,
    registered,
    token: extractToken(loginResponse),
    user: extractUser(loginResponse),
  };
}

async function safeAction(label, action) {
  try {
    return await action();
  } catch (error) {
    console.warn(`[seed warning] ${label}: ${error.message}`);
    return null;
  }
}

async function main() {
  await waitForHealth();

  const admin = await ensureAccount(accounts.admin);
  const tourists = [];
  for (const tourist of accounts.tourists) {
    tourists.push(await ensureAccount(tourist));
  }

  const guides = [];
  for (const guide of accounts.guides) {
    guides.push(await ensureAccount(guide));
  }

  const hotels = [];
  for (const hotel of accounts.hotels) {
    hotels.push(await ensureAccount(hotel));
  }

  const [touristA, touristB] = tourists;
  const [guideMaya, guideSuraj, guideRina] = guides;
  const [hotelHimalayan, hotelLakeside, hotelValley] = hotels;

  await request("PATCH", `/admin/guides/${guideMaya.user.user_id}/verify`, {
    token: admin.token,
    body: {},
  });
  await request("PATCH", `/admin/guides/${guideSuraj.user.user_id}/verify`, {
    token: admin.token,
    body: {},
  });
  await request("PATCH", `/admin/guides/${guideRina.user.user_id}/reject`, {
    token: admin.token,
    body: { reason: "Demo rejected guide profile for moderation workflow." },
  });
  await request("PATCH", `/admin/hotels/${hotelHimalayan.user.user_id}/verify`, {
    token: admin.token,
    body: {},
  });
  await request("PATCH", `/admin/hotels/${hotelLakeside.user.user_id}/verify`, {
    token: admin.token,
    body: {},
  });
  await request("PATCH", `/admin/hotels/${hotelValley.user.user_id}/reject`, {
    token: admin.token,
    body: { reason: "Demo rejected hotel profile for moderation workflow." },
  });

  await request("PATCH", "/guide/profile", {
    token: guideMaya.token,
    body: { bio: guideMaya.bio, experienceYears: 6, isAvailable: true },
  });
  await request("PATCH", "/guide/availability", {
    token: guideMaya.token,
    body: { isAvailable: true },
  });
  await request("PATCH", "/guide/profile", {
    token: guideSuraj.token,
    body: { bio: guideSuraj.bio, experienceYears: 8, isAvailable: true },
  });
  await request("PATCH", "/guide/availability", {
    token: guideSuraj.token,
    body: { isAvailable: true },
  });
  await request("PATCH", "/guide/profile", {
    token: guideRina.token,
    body: { bio: guideRina.bio, experienceYears: 4, isAvailable: false },
  });
  await request("PATCH", "/guide/availability", {
    token: guideRina.token,
    body: { isAvailable: false },
  });

  for (const hotel of hotels) {
    await request("PATCH", "/hotel/profile", {
      token: hotel.token,
      body: {
        hotelName: hotel.businessName,
        location: hotel.hotelLocation.address,
        description: hotel.description,
        basePrice: hotel.basePrice,
        images: hotel.images,
        roomDetails: hotel.roomDetails,
        facilities: hotel.facilities,
      },
    });
  }

  await request("PATCH", "/tourist/profile", {
    token: touristA.token,
    body: {
      fullName: touristA.fullName,
      username: touristA.username,
      phone: touristA.phone,
      emergencyContact: touristA.emergencyContact,
      preferences: touristA.preferences,
    },
  });
  await request("PATCH", "/tourist/profile", {
    token: touristB.token,
    body: {
      fullName: touristB.fullName,
      username: touristB.username,
      phone: touristB.phone,
      emergencyContact: touristB.emergencyContact,
      preferences: touristB.preferences,
    },
  });

  const savedPlaces = [
    {
      token: touristA.token,
      entries: [
        {
          name: "Patan Durbar Square",
          location: "Lalitpur, Nepal",
          image:
            "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&q=80",
          notes: "Best visited in the late afternoon for warm light.",
        },
        {
          name: "Boudhanath Stupa",
          location: "Kathmandu, Nepal",
          image:
            "https://images.unsplash.com/photo-1580294647332-8a399cd9ed45?w=800&q=80",
          notes: "Quiet rooftop cafes nearby with panoramic views.",
        },
      ],
    },
    {
      token: touristB.token,
      entries: [
        {
          name: "Phewa Lake",
          location: "Pokhara, Nepal",
          image:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
          notes: "Ideal for sunrise boating and mountain reflections.",
        },
      ],
    },
  ];

  for (const group of savedPlaces) {
    for (const entry of group.entries) {
      await request("POST", "/tourist/saved-places", {
        token: group.token,
        body: entry,
      });
    }
  }

  const paymentMethods = [
    {
      token: touristA.token,
      methods: [
        {
          label: "Visa Personal",
          brand: "Visa",
          last4: "4242",
          expiryMonth: "09",
          expiryYear: "2028",
          isDefault: true,
        },
        {
          label: "Mastercard Backup",
          brand: "Mastercard",
          last4: "5100",
          expiryMonth: "01",
          expiryYear: "2029",
          isDefault: false,
        },
      ],
    },
    {
      token: touristB.token,
      methods: [
        {
          label: "Visa Travel",
          brand: "Visa",
          last4: "1111",
          expiryMonth: "04",
          expiryYear: "2027",
          isDefault: true,
        },
      ],
    },
  ];

  for (const group of paymentMethods) {
    for (const method of group.methods) {
      await request("POST", "/tourist/payment-methods", {
        token: group.token,
        body: method,
      });
    }
  }

  await request("PATCH", "/tourist/privacy-settings", {
    token: touristA.token,
    body: {
      profileVisibility: "private",
      shareLocation: true,
    },
  });
  await request("PATCH", "/tourist/privacy-settings", {
    token: touristB.token,
    body: {
      profileVisibility: "public",
      shareLocation: false,
    },
  });

  const bookingGuideConfirmed = await request("POST", "/tourist/bookings", {
    token: touristA.token,
    body: {
      guideId: guideMaya.user.user_id,
      startDate: isoDate(7),
      endDate: isoDate(8),
      totalPrice: 120,
    },
  });
  await request("PATCH", `/guide/bookings/${bookingGuideConfirmed.data.bookingId}/accept`, {
    token: guideMaya.token,
    body: {},
  });

  const bookingGuideRejected = await request("POST", "/tourist/bookings", {
    token: touristA.token,
    body: {
      guideId: guideSuraj.user.user_id,
      startDate: isoDate(10),
      endDate: isoDate(11),
      totalPrice: 140,
    },
  });
  await request("PATCH", `/guide/bookings/${bookingGuideRejected.data.bookingId}/reject`, {
    token: guideSuraj.token,
    body: { reason: "Guide unavailable for the requested dates in demo flow." },
  });

  const bookingHotelConfirmed = await request("POST", "/tourist/bookings", {
    token: touristB.token,
    body: {
      hotelId: hotelHimalayan.user.user_id,
      startDate: isoDate(5),
      endDate: isoDate(7),
      totalPrice: 240,
    },
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelConfirmed.data.bookingId}/accept`, {
    token: hotelHimalayan.token,
    body: {},
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelConfirmed.data.bookingId}/status`, {
    token: hotelHimalayan.token,
    body: { status: "ongoing" },
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelConfirmed.data.bookingId}/status`, {
    token: hotelHimalayan.token,
    body: { status: "completed" },
  });

  const bookingHotelRejected = await request("POST", "/tourist/bookings", {
    token: touristB.token,
    body: {
      hotelId: hotelLakeside.user.user_id,
      startDate: isoDate(14),
      endDate: isoDate(16),
      totalPrice: 330,
    },
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelRejected.data.bookingId}/reject`, {
    token: hotelLakeside.token,
    body: {},
  });

  const bookingHotelCancelled = await request("POST", "/tourist/bookings", {
    token: touristA.token,
    body: {
      hotelId: hotelHimalayan.user.user_id,
      startDate: isoDate(20),
      endDate: isoDate(22),
      totalPrice: 260,
    },
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelCancelled.data.bookingId}/accept`, {
    token: hotelHimalayan.token,
    body: {},
  });
  await request("PATCH", `/hotel/bookings/${bookingHotelCancelled.data.bookingId}/status`, {
    token: hotelHimalayan.token,
    body: { status: "pending_cancellation" },
  });
  await request(
    "PATCH",
    `/hotel/bookings/${bookingHotelCancelled.data.bookingId}/cancel-request`,
    {
      token: hotelHimalayan.token,
      body: { approve: true },
    }
  );

  await request("POST", "/tourist/reviews", {
    token: touristA.token,
    body: {
      guideId: guideMaya.user.user_id,
      rating: 5,
      comment: `Fantastic cultural storytelling and pacing. ${seedTag}`,
    },
  });
  await request("POST", "/tourist/reviews", {
    token: touristB.token,
    body: {
      hotelId: hotelHimalayan.user.user_id,
      rating: 4,
      comment: `Comfortable stay and warm staff service. ${seedTag}`,
    },
  });
  await request("POST", "/tourist/reviews", {
    token: touristA.token,
    body: {
      hotelId: hotelLakeside.user.user_id,
      rating: 5,
      comment: `Saved this for a future lakeside weekend trip. ${seedTag}`,
    },
  });

  await request("POST", "/tourist/messages", {
    token: touristA.token,
    body: {
      bookingId: bookingGuideConfirmed.data.bookingId,
      content: `Hi Maya, excited for our tour. ${seedTag}`,
    },
  });
  await request("POST", "/guide/messages", {
    token: guideMaya.token,
    body: {
      bookingId: bookingGuideConfirmed.data.bookingId,
      content: `Looking forward to it too. I will share the meetup point soon. ${seedTag}`,
    },
  });

  await request("POST", "/tourist/sos", {
    token: touristA.token,
    body: {
      location: "Thamel, Kathmandu",
      description: `Demo SOS check for emergency workflow. ${seedTag}`,
    },
  });

  const incident = await request("POST", "/tourist/incidents", {
    token: touristB.token,
    body: {
      bookingId: bookingHotelConfirmed.data.bookingId,
      incidentType: "Lost Item",
      details: `Guest reported a misplaced bag near the lobby. ${seedTag}`,
      location: "Himalayan Haven lobby",
    },
  });
  await request("PATCH", `/admin/incidents/${incident.data.incidentId}/resolve`, {
    token: admin.token,
    body: { resolution: `Handled by front desk and admin follow-up. ${seedTag}` },
  });

  const touristNotifications = await request("GET", "/tourist/notifications", {
    token: touristA.token,
  });
  if (touristNotifications.data.notifications.length > 0) {
    const notificationId = touristNotifications.data.notifications[0].notification_id;
    await safeAction("mark tourist notification read", () =>
      request("PATCH", `/tourist/notifications/${notificationId}/read`, {
        token: touristA.token,
        body: {},
      })
    );
  }
  await safeAction("mark all tourist notifications read", () =>
    request("PATCH", "/tourist/notifications/read-all", {
      token: touristB.token,
      body: {},
    })
  );

  const guideNotifications = await request("GET", "/guide/notifications", {
    token: guideMaya.token,
  });
  if (guideNotifications.data.notifications.length > 0) {
    const notificationId = guideNotifications.data.notifications[0].notification_id;
    await safeAction("mark guide notification read", () =>
      request("PATCH", `/guide/notifications/${notificationId}/read`, {
        token: guideMaya.token,
        body: {},
      })
    );
  }

  const hotelNotifications = await request("GET", "/hotel/notifications", {
    token: hotelHimalayan.token,
  });
  if (hotelNotifications.data.notifications.length > 0) {
    const notificationId = hotelNotifications.data.notifications[0].notification_id;
    await safeAction("mark hotel notification read", () =>
      request("PATCH", `/hotel/notifications/${notificationId}/read`, {
        token: hotelHimalayan.token,
        body: {},
      })
    );
  }

  const report = {
    generatedAt: TODAY.toISOString(),
    apiBase: API_BASE,
    seedTag,
    accounts: {
      admin: {
        role: admin.role,
        email: admin.email,
        password: admin.password,
      },
      tourists: tourists.map((item) => ({
        role: item.role,
        email: item.email,
        password: item.password,
      })),
      guides: guides.map((item) => ({
        role: item.role,
        email: item.email,
        password: item.password,
      })),
      hotels: hotels.map((item) => ({
        role: item.role,
        email: item.email,
        password: item.password,
      })),
    },
    summaries: {
      adminDashboard: await request("GET", "/admin/dashboard", { token: admin.token }),
      adminUsers: await request("GET", "/admin/users", { token: admin.token }),
      adminGuides: await request("GET", "/admin/guides", { token: admin.token }),
      adminHotels: await request("GET", "/admin/hotels", { token: admin.token }),
      adminBookings: await request("GET", "/admin/bookings", { token: admin.token }),
      adminIncidents: await request("GET", "/admin/incidents", { token: admin.token }),
      adminActivities: await request("GET", "/admin/activities", { token: admin.token }),
      touristADashboard: await request("GET", "/tourist/dashboard", { token: touristA.token }),
      touristABookings: await request("GET", "/tourist/bookings", { token: touristA.token }),
      touristAReviews: await request("GET", "/tourist/reviews", { token: touristA.token }),
      touristAMessages: await request(
        "GET",
        `/tourist/messages?bookingId=${bookingGuideConfirmed.data.bookingId}`,
        { token: touristA.token }
      ),
      touristASavedPlaces: await request("GET", "/tourist/saved-places", { token: touristA.token }),
      touristAPaymentMethods: await request("GET", "/tourist/payment-methods", {
        token: touristA.token,
      }),
      touristANotifications: await request("GET", "/tourist/notifications", {
        token: touristA.token,
      }),
      guideDashboard: await request("GET", "/guide/dashboard", { token: guideMaya.token }),
      guideBookings: await request("GET", "/guide/bookings", { token: guideMaya.token }),
      guideReviews: await request("GET", "/guide/reviews", { token: guideMaya.token }),
      guideUpcomingTours: await request("GET", "/guide/upcoming-tours", {
        token: guideMaya.token,
      }),
      guideAnalytics: await request("GET", "/guide/analytics", { token: guideMaya.token }),
      guideMessages: await request(
        "GET",
        `/guide/messages?bookingId=${bookingGuideConfirmed.data.bookingId}`,
        { token: guideMaya.token }
      ),
      hotelDashboard: await request("GET", "/hotel/dashboard", { token: hotelHimalayan.token }),
      hotelBookings: await request("GET", "/hotel/bookings", { token: hotelHimalayan.token }),
      hotelReviews: await request("GET", "/hotel/reviews", { token: hotelHimalayan.token }),
      hotelAnalytics: await request("GET", "/hotel/analytics", { token: hotelHimalayan.token }),
      hotelNotifications: await request("GET", "/hotel/notifications", {
        token: hotelHimalayan.token,
      }),
      publicGuides: await request("GET", "/public/guides?limit=20"),
      publicGuideDetail: await request("GET", `/public/guides/${guideMaya.user.user_id}`),
      publicHotels: await request("GET", "/public/hotels?limit=20"),
      publicHotelDetail: await request("GET", `/public/hotels/${hotelHimalayan.user.user_id}`),
      publicSearch: await request("GET", "/public/search?q=Kathmandu&type=all"),
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`Demo API seeding complete.`);
  console.log(`Report written to ${outputPath}`);
  console.log(`Admin login: ${admin.email} / ${admin.password}`);
  for (const groupName of ["tourists", "guides", "hotels"]) {
    for (const item of report.accounts[groupName]) {
      console.log(`${groupName.slice(0, -1)} login: ${item.email} / ${item.password}`);
    }
  }
}

main().catch((error) => {
  console.error("Demo API seeding failed.");
  console.error(error.message);
  if (error.response) {
    console.error(JSON.stringify(error.response, null, 2));
  }
  process.exit(1);
});
