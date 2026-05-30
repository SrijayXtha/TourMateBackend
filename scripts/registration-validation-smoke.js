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
    fullName: `Validation ${role} ${stamp}`,
    username: `validation_${role}_${stamp}`,
    email: `validation.${role}.${stamp}@tourmate.local`,
    password: "Pass123!",
    phone: `98${String(stamp).slice(-8)}`,
    role,
  };
}

async function expectValidationFailure(context, body, expectedField) {
  const response = await request("POST", "/auth/register", body);
  assertStatus(response, 400, context);

  const fieldError = response.body?.errors?.[expectedField];
  if (!fieldError) {
    throw new Error(`${context} did not return an error for ${expectedField}`);
  }

  console.log(`PASS ${context}`);
}

async function expectSuccess(context, body) {
  const response = await request("POST", "/auth/register", body);
  assertStatus(response, 201, context);
  console.log(`PASS ${context}`);
  return response;
}

async function registerAdmin(stamp) {
  const adminBody = {
    ...buildBaseUser(stamp, "admin"),
    username: `validation_admin_${stamp}`,
    email: `validation.admin.${stamp}@tourmate.local`,
  };

  const response = await request("POST", "/auth/register", adminBody);
  assertStatus(response, 201, "admin registration for validation smoke");
  return response.body?.data?.token;
}

async function main() {
  const health = await request("GET", "/health");
  assertStatus(health, 200, "GET /health");
  console.log("PASS health");

  const stamp = Date.now();
  const adminToken = await registerAdmin(stamp - 5000);
  const destinationCreate = await request(
    "POST",
    "/admin/destinations",
    {
      name: `Validation Destination ${stamp}`,
      location: "Kathmandu, Nepal",
      latitude: 27.7172,
      longitude: 85.324,
      category: "Heritage",
    },
    adminToken
  );
  assertStatus(destinationCreate, 201, "admin destination create for guide registration");
  const destinationId = destinationCreate.body?.data?.destination?.destinationId;

  const guideBase = buildBaseUser(stamp, "guide");
  const hotelBase = buildBaseUser(stamp + 1000, "hotel");

  const validGuide = {
    ...guideBase,
    specialization: "Cultural Heritage Tours",
    destinations: [destinationId],
    languages: ["English", "Nepali"],
    experienceYears: "3-5",
    profilePhoto:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn0mXQAAAAASUVORK5CYII=",
    licenseDocument: {
      name: "guide-license.pdf",
      uri: "file:///tmp/guide-license.pdf",
    },
  };

  const validHotel = {
    ...hotelBase,
    businessName: `Validation Hotel ${stamp}`,
    registrationNumber: `REG-${stamp}`,
    hotelLicense: {
      name: "hotel-license.pdf",
      uri: "file:///tmp/hotel-license.pdf",
    },
    hotelLocation: {
      latitude: 27.7172,
      longitude: 85.324,
      address: "Kathmandu, Nepal",
    },
  };

  await expectValidationFailure(
    "guide missing license should fail",
    {
      ...guideBase,
      specialization: "Nature Tours",
      destinations: [destinationId],
      languages: ["English"],
      experienceYears: "1-3",
    },
    "licenseDocument"
  );

  await expectValidationFailure(
    "guide missing specialization should fail",
    {
      ...guideBase,
      experienceYears: "1-3",
      destinations: [destinationId],
      languages: ["English"],
      licenseDocument: validGuide.licenseDocument,
    },
    "specialization"
  );

  await expectValidationFailure(
    "guide missing experience should fail",
    {
      ...guideBase,
      specialization: "Nature Tours",
      destinations: [destinationId],
      languages: ["English"],
      licenseDocument: validGuide.licenseDocument,
    },
    "experienceYears"
  );

  await expectValidationFailure(
    "guide missing destination should fail",
    {
      ...guideBase,
      specialization: "Nature Tours",
      experienceYears: "1-3",
      languages: ["English"],
      licenseDocument: validGuide.licenseDocument,
    },
    "destinations"
  );

  await expectValidationFailure(
    "guide missing language should fail",
    {
      ...guideBase,
      specialization: "Nature Tours",
      experienceYears: "1-3",
      destinations: [destinationId],
      licenseDocument: validGuide.licenseDocument,
    },
    "languages"
  );

  const guideSuccess = await expectSuccess("guide with all fields should pass", validGuide);
  const guideToken = guideSuccess.body?.data?.token;
  const guideProfile = await request("GET", "/guide/profile", undefined, guideToken);
  assertStatus(guideProfile, 200, "guide profile with stored photo");
  if (guideProfile.body?.data?.profile_photo !== validGuide.profilePhoto) {
    throw new Error("Guide profile photo was not persisted correctly.");
  }
  console.log("PASS guide profile photo persists");

  await expectValidationFailure(
    "hotel missing business name should fail",
    {
      ...hotelBase,
      registrationNumber: validHotel.registrationNumber,
      hotelLicense: validHotel.hotelLicense,
      hotelLocation: validHotel.hotelLocation,
    },
    "businessName"
  );

  await expectValidationFailure(
    "hotel missing registration number should fail",
    {
      ...hotelBase,
      businessName: validHotel.businessName,
      hotelLicense: validHotel.hotelLicense,
      hotelLocation: validHotel.hotelLocation,
    },
    "registrationNumber"
  );

  await expectValidationFailure(
    "hotel missing license upload should fail",
    {
      ...hotelBase,
      businessName: validHotel.businessName,
      registrationNumber: validHotel.registrationNumber,
      hotelLocation: validHotel.hotelLocation,
    },
    "hotelLicense"
  );

  await expectValidationFailure(
    "hotel missing map location should fail",
    {
      ...hotelBase,
      businessName: validHotel.businessName,
      registrationNumber: validHotel.registrationNumber,
      hotelLicense: validHotel.hotelLicense,
    },
    "hotelLocation"
  );

  await expectSuccess("hotel with all fields should pass", validHotel);

  console.log("\nSMOKE_OK: registration validation checks passed");
}

main().catch((error) => {
  console.error("\nSMOKE_FAILED:", error.message || error);
  process.exit(1);
});
