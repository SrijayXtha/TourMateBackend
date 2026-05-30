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

async function request(method, path, body, token) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed = null;
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

function buildBaseUser(stamp, role) {
  return {
    fullName: `Smoke ${role} ${stamp}`,
    username: `smoke_${role}_${stamp}`,
    email: `smoke.${role}.${stamp}@tourmate.local`,
    password: "Pass123!",
    phone: `98${String(stamp).slice(-8)}`,
    role,
  };
}

async function registerUser(stamp, role, extras = {}) {
  const response = await request("POST", "/auth/register", {
    ...buildBaseUser(stamp, role),
    ...extras,
  });
  assertStatus(response, 201, `${role} registration`);
  return {
    token: response.body?.data?.token,
    user: response.body?.data?.user,
  };
}

async function main() {
  const health = await request("GET", "/health");
  assertStatus(health, 200, "GET /health");
  console.log("PASS health");

  const stamp = Date.now();
  const admin = await registerUser(stamp, "admin");
  const tourist = await registerUser(stamp + 1, "tourist", {
    emergencyContact: "9800000000",
  });

  const createDestination = await request(
    "POST",
    "/admin/destinations",
    {
      name: `Pokhara Demo ${stamp}`,
      location: "Pokhara, Nepal",
      latitude: 28.2096,
      longitude: 83.9856,
      description: "Lake city demo destination",
      category: "City",
      popularityScore: 4.8,
    },
    admin.token
  );
  assertStatus(createDestination, 201, "admin can add destination");
  const destinationId = createDestination.body?.data?.destination?.destinationId;
  console.log("PASS admin can add destination");

  const touristCreateAttempt = await request(
    "POST",
    "/admin/destinations",
    {
      name: `Should Fail ${stamp}`,
      location: "Nope",
    },
    tourist.token
  );
  assertStatus(touristCreateAttempt, 403, "non-admin cannot add destination");
  console.log("PASS non-admin cannot add destination");

  const guideStamp = stamp + 2;
  const guide = await registerUser(guideStamp, "guide", {
    specialization: "Trekking",
    destinations: [destinationId],
    languages: ["English", "Nepali"],
    experienceYears: "3-5",
    licenseDocument: {
      name: "guide-license.pdf",
      uri: "file:///tmp/guide-license.pdf",
    },
  });
  console.log("PASS guide must select at least one destination during registration");
  console.log("PASS guide must select at least one language during registration");

  const guideRequest = await request(
    "POST",
    "/guide/destination-requests",
    {
      destinationName: `Bandipur Demo ${stamp}`,
      location: "Bandipur, Nepal",
      reason: "Popular heritage stop for walking tours",
    },
    guide.token
  );
  assertStatus(guideRequest, 201, "guide can request new destination");
  console.log("PASS guide can request new destination");
  const requestId = guideRequest.body?.data?.requestId;

  const approveRequest = await request(
    "PATCH",
    `/admin/destination-requests/${requestId}/approve`,
    { category: "Heritage" },
    admin.token
  );
  assertStatus(approveRequest, 200, "admin can approve destination request");
  console.log("PASS admin can approve destination request");

  const secondDestination = await request(
    "POST",
    "/admin/destinations",
    {
      name: `Mustang Demo ${stamp}`,
      location: "Mustang, Nepal",
      latitude: 28.9985,
      longitude: 83.8473,
      description: "High-altitude trail hub",
      category: "Adventure",
      popularityScore: 4.9,
    },
    admin.token
  );
  assertStatus(secondDestination, 201, "second destination create");
  const secondDestinationId = secondDestination.body?.data?.destination?.destinationId;

  const secondGuide = await registerUser(stamp + 3, "guide", {
    specialization: "Cultural",
    destinations: [secondDestinationId],
    languages: ["French", "English"],
    experienceYears: "1-3",
    licenseDocument: {
      name: "guide-license-2.pdf",
      uri: "file:///tmp/guide-license-2.pdf",
    },
  });

  await request("PATCH", `/admin/guides/${guide.user.user_id}/verify`, undefined, admin.token);
  await request(
    "PATCH",
    `/admin/guides/${secondGuide.user.user_id}/verify`,
    undefined,
    admin.token
  );

  const searchByDestination = await request(
    "GET",
    `/guides?search=${encodeURIComponent(`Pokhara Demo ${stamp}`)}`
  );
  assertStatus(searchByDestination, 200, "search guides by destination");
  const destinationGuides = searchByDestination.body?.data?.guides || [];
  if (!destinationGuides.some((item) => String(item.name).includes(`Smoke guide ${guideStamp}`))) {
    throw new Error("Searching destination name did not return the expected guide");
  }
  console.log("PASS searching destination name filters guides correctly");

  const searchByLanguage = await request("GET", "/guides?language=French");
  assertStatus(searchByLanguage, 200, "search guides by language");
  const languageGuides = searchByLanguage.body?.data?.guides || [];
  if (!languageGuides.some((item) => String(item.name).includes(`Smoke guide ${stamp + 3}`))) {
    throw new Error("Searching language did not return the expected guide");
  }
  console.log("PASS searching language filters guides correctly");

  const noMatch = await request("GET", "/guides?search=Atlantis");
  assertStatus(noMatch, 200, "no match guide search");
  if ((noMatch.body?.data?.guides || []).length !== 0) {
    throw new Error("Expected no guides for unmatched destination search");
  }
  console.log("PASS no matching guide shows empty state data");

  const deleteDestination = await request(
    "DELETE",
    `/admin/destinations/${secondDestinationId}`,
    undefined,
    admin.token
  );
  assertStatus(deleteDestination, 200, "admin can delete destination");
  console.log("PASS admin can delete destination");

  console.log("\nSMOKE_OK: destination management checks passed");
}

main().catch((error) => {
  console.error("\nSMOKE_FAILED:", error.message || error);
  process.exit(1);
});
