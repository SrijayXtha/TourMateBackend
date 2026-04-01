const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:4000";

function assertStatus(response, expected, context) {
  if (response.status !== expected) {
    throw new Error(
      `${context} expected status ${expected} but got ${response.status}: ${JSON.stringify(
        response.body
      )}`
    );
  }
}

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed;
  const text = await response.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return {
    status: response.status,
    body: parsed,
  };
}

async function main() {
  const stamp = Date.now();
  const password = "Pass123!";

  const users = {
    admin: {
      email: "admin.runtime@tourmate.local",
      password: "Admin123!",
    },
    tourist: {
      fullName: `Runtime Tourist ${stamp}`,
      email: `runtime.tourist.${stamp}@tourmate.local`,
      password,
      phone: `0700${String(stamp).slice(-6)}`,
      role: "tourist",
    },
    guide: {
      fullName: `Runtime Guide ${stamp}`,
      email: `runtime.guide.${stamp}@tourmate.local`,
      password,
      phone: `0710${String(stamp).slice(-6)}`,
      role: "guide",
      experienceYears: "4",
    },
    hotel: {
      fullName: `Runtime Hotel Owner ${stamp}`,
      email: `runtime.hotel.${stamp}@tourmate.local`,
      password,
      phone: `0720${String(stamp).slice(-6)}`,
      role: "hotel",
      businessName: `Runtime Hotel ${stamp}`,
    },
  };

  const results = [];
  const note = (msg) => {
    results.push(msg);
    console.log(msg);
  };

  const health = await request("GET", "/health");
  assertStatus(health, 200, "GET /health");
  note("PASS health");

  const touristRegister = await request("POST", "/auth/register", { body: users.tourist });
  assertStatus(touristRegister, 201, "register tourist");
  const touristToken = touristRegister.body?.data?.token;
  const touristId = Number(touristRegister.body?.data?.user?.id);
  note("PASS register tourist");

  const guideRegister = await request("POST", "/auth/register", { body: users.guide });
  assertStatus(guideRegister, 201, "register guide");
  const guideToken = guideRegister.body?.data?.token;
  const guideId = Number(guideRegister.body?.data?.user?.id);
  note("PASS register guide");

  const hotelRegister = await request("POST", "/auth/register", { body: users.hotel });
  assertStatus(hotelRegister, 201, "register hotel");
  const hotelToken = hotelRegister.body?.data?.token;
  const hotelId = Number(hotelRegister.body?.data?.user?.id);
  note("PASS register hotel");

  const adminLogin = await request("POST", "/auth/login", {
    body: {
      email: users.admin.email,
      password: users.admin.password,
    },
  });
  assertStatus(adminLogin, 200, "admin login");
  const adminToken = adminLogin.body?.data?.token;
  note("PASS admin login");

  const pendingGuides = await request("GET", "/admin/guides/pending-verification", {
    token: adminToken,
  });
  assertStatus(pendingGuides, 200, "admin pending guides");
  const pendingGuide = (pendingGuides.body?.data?.guides || []).find((g) => g.guideId === guideId);
  if (!pendingGuide) {
    throw new Error("Created guide was not found in pending verification list");
  }
  note("PASS admin pending guides");

  const verifyGuide = await request("PATCH", `/admin/guides/${guideId}/verify`, {
    token: adminToken,
    body: {},
  });
  assertStatus(verifyGuide, 200, "admin verify guide");
  note("PASS admin verify guide");

  const pendingHotels = await request("GET", "/admin/hotels/pending-verification", {
    token: adminToken,
  });
  assertStatus(pendingHotels, 200, "admin pending hotels");
  const pendingHotel = (pendingHotels.body?.data?.hotels || []).find((h) => h.hotelId === hotelId);
  if (!pendingHotel) {
    throw new Error("Created hotel was not found in pending verification list");
  }
  note("PASS admin pending hotels");

  const verifyHotel = await request("PATCH", `/admin/hotels/${hotelId}/verify`, {
    token: adminToken,
    body: {},
  });
  assertStatus(verifyHotel, 200, "admin verify hotel");
  note("PASS admin verify hotel");

  const touristProfile = await request("GET", "/tourist/profile", { token: touristToken });
  assertStatus(touristProfile, 200, "tourist profile");
  note("PASS tourist profile");

  const touristDashboard = await request("GET", "/tourist/dashboard", { token: touristToken });
  assertStatus(touristDashboard, 200, "tourist dashboard");
  note("PASS tourist dashboard");

  const addSavedPlace = await request("POST", "/tourist/saved-places", {
    token: touristToken,
    body: { name: "Runtime Plaza", location: "Runtime City" },
  });
  assertStatus(addSavedPlace, 201, "tourist add saved place");
  note("PASS tourist add saved place");

  const addPaymentMethod = await request("POST", "/tourist/payment-methods", {
    token: touristToken,
    body: { label: "Runtime Card", last4: "4242", brand: "Visa", isDefault: true },
  });
  assertStatus(addPaymentMethod, 201, "tourist add payment method");
  note("PASS tourist add payment method");

  const updatePrivacy = await request("PATCH", "/tourist/privacy-settings", {
    token: touristToken,
    body: { profileVisibility: "private", shareLocation: true, twoFactorEnabled: false },
  });
  assertStatus(updatePrivacy, 200, "tourist update privacy");
  note("PASS tourist update privacy");

  const guideBookingCreate = await request("POST", "/tourist/bookings", {
    token: touristToken,
    body: {
      guideId,
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      totalPrice: 300,
    },
  });
  assertStatus(guideBookingCreate, 201, "tourist create guide booking");
  note("PASS tourist create guide booking");

  const hotelBookingCreate = await request("POST", "/tourist/bookings", {
    token: touristToken,
    body: {
      hotelId,
      startDate: "2026-04-15",
      endDate: "2026-04-18",
      totalPrice: 500,
    },
  });
  assertStatus(hotelBookingCreate, 201, "tourist create hotel booking");
  note("PASS tourist create hotel booking");

  const touristBookings = await request("GET", "/tourist/bookings", { token: touristToken });
  assertStatus(touristBookings, 200, "tourist list bookings");
  const allBookings = touristBookings.body?.data?.bookings || [];
  const guideBooking = allBookings.find((b) => Number(b.guide?.id) === guideId && b.status === "pending");
  const hotelBooking = allBookings.find((b) => Number(b.hotel?.id) === hotelId && b.status === "pending");
  if (!guideBooking || !hotelBooking) {
    throw new Error(`Unable to locate pending guide/hotel bookings for runtime users: ${JSON.stringify(allBookings)}`);
  }
  note("PASS tourist list bookings");

  const guideDashboard = await request("GET", "/guide/dashboard", { token: guideToken });
  assertStatus(guideDashboard, 200, "guide dashboard");
  note("PASS guide dashboard");

  const guideBookings = await request("GET", "/guide/bookings", { token: guideToken });
  assertStatus(guideBookings, 200, "guide bookings");
  note("PASS guide bookings");

  const guideAccept = await request("PATCH", `/guide/bookings/${guideBooking.id}/accept`, {
    token: guideToken,
    body: {},
  });
  assertStatus(guideAccept, 200, "guide accept booking");
  note("PASS guide accept booking");

  const guideMessage = await request("POST", "/guide/messages", {
    token: guideToken,
    body: {
      receiverId: touristId,
      content: "Runtime smoke message from guide",
    },
  });
  assertStatus(guideMessage, 201, "guide send message");
  note("PASS guide send message");

  const guideNotifications = await request("GET", "/guide/notifications", { token: guideToken });
  assertStatus(guideNotifications, 200, "guide notifications");
  note("PASS guide notifications");

  const hotelDashboard = await request("GET", "/hotel/dashboard", { token: hotelToken });
  assertStatus(hotelDashboard, 200, "hotel dashboard");
  note("PASS hotel dashboard");

  const hotelBookings = await request("GET", "/hotel/bookings", { token: hotelToken });
  assertStatus(hotelBookings, 200, "hotel bookings");
  note("PASS hotel bookings");

  const hotelAccept = await request("PATCH", `/hotel/bookings/${hotelBooking.id}/accept`, {
    token: hotelToken,
    body: {},
  });
  assertStatus(hotelAccept, 200, "hotel accept booking");
  note("PASS hotel accept booking");

  const hotelNotifications = await request("GET", "/hotel/notifications", { token: hotelToken });
  assertStatus(hotelNotifications, 200, "hotel notifications");
  note("PASS hotel notifications");

  const touristSOS = await request("POST", "/tourist/sos", {
    token: touristToken,
    body: { location: "Runtime Point", description: "Smoke check SOS" },
  });
  assertStatus(touristSOS, 201, "tourist report sos");
  note("PASS tourist report sos");

  const touristIncident = await request("POST", "/tourist/incidents", {
    token: touristToken,
    body: {
      bookingId: guideBooking.id,
      incidentType: "Other",
      details: "Runtime incident check",
      location: "Runtime Point",
    },
  });
  assertStatus(touristIncident, 201, "tourist report incident");
  note("PASS tourist report incident");

  const adminDashboard = await request("GET", "/admin/dashboard", { token: adminToken });
  assertStatus(adminDashboard, 200, "admin dashboard");
  note("PASS admin dashboard");

  const adminUsers = await request("GET", "/admin/users?role=tourist&page=1&limit=20", {
    token: adminToken,
  });
  assertStatus(adminUsers, 200, "admin users");
  note("PASS admin users");

  const adminBookings = await request("GET", "/admin/bookings?page=1&limit=20", {
    token: adminToken,
  });
  assertStatus(adminBookings, 200, "admin bookings");
  note("PASS admin bookings");

  const adminIncidents = await request("GET", "/admin/incidents", { token: adminToken });
  assertStatus(adminIncidents, 200, "admin incidents");
  const incident = adminIncidents.body?.data?.incidents?.data?.[0];
  if (incident?.id) {
    const resolveIncident = await request("PATCH", `/admin/incidents/${incident.id}/resolve`, {
      token: adminToken,
      body: { resolution: "Runtime resolved" },
    });
    assertStatus(resolveIncident, 200, "admin resolve incident");
    note("PASS admin resolve incident");
  }

  const adminActivities = await request("GET", "/admin/activities", { token: adminToken });
  assertStatus(adminActivities, 200, "admin activities");
  note("PASS admin activities");

  const touristNotifications = await request("GET", "/tourist/notifications", {
    token: touristToken,
  });
  assertStatus(touristNotifications, 200, "tourist notifications");
  note("PASS tourist notifications");

  console.log("\nSMOKE_OK: role runtime verification passed");
}

main().catch((error) => {
  console.error("\nSMOKE_FAILED:", error.message || error);
  process.exit(1);
});
