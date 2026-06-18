import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  await prisma.analytics.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.property.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();

  const [adminPassword, agentPassword, testPassword, managerPassword] = await Promise.all([
    bcrypt.hash("Admin@123", SALT_ROUNDS),
    bcrypt.hash("Agent@123", SALT_ROUNDS),
    bcrypt.hash("Test@123", SALT_ROUNDS),
    bcrypt.hash("Manager@123", SALT_ROUNDS),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@yandoxcrm.com",
      password: adminPassword,
      role: "admin",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Manager User",
      email: "manager@yandoxcrm.com",
      password: managerPassword,
      role: "manager",
    },
  });

  const agentUser = await prisma.user.create({
    data: {
      name: "Sarah Mitchell",
      email: "agent@yandoxcrm.com",
      password: agentPassword,
      role: "agent",
    },
  });

  const testUser = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@yandoxcrm.com",
      password: testPassword,
      role: "agent",
    },
  });

  const agentUser2 = await prisma.user.create({
    data: {
      name: "James Harrington",
      email: "james@yandoxcrm.com",
      password: await bcrypt.hash("Agent2@123", SALT_ROUNDS),
      role: "agent",
    },
  });

  const agentUser3 = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@yandoxcrm.com",
      password: await bcrypt.hash("Agent3@123", SALT_ROUNDS),
      role: "agent",
    },
  });

  const agentProfile1 = await prisma.agent.create({
    data: {
      userId: agentUser.id,
      experience: 7,
      specialization: "Residential Sales",
      performanceScore: 91.5,
    },
  });

  const agentProfile2 = await prisma.agent.create({
    data: {
      userId: agentUser2.id,
      experience: 4,
      specialization: "Luxury Properties",
      performanceScore: 85.2,
    },
  });

  const agentProfile3 = await prisma.agent.create({
    data: {
      userId: agentUser3.id,
      experience: 9,
      specialization: "Commercial Real Estate",
      performanceScore: 96.1,
    },
  });

  await prisma.customer.createMany({
    data: [
      {
        name: "Ava Thompson",
        phone: "+1-415-555-0192",
        email: "ava.thompson@example.com",
        budget: 650000,
        preferredLocation: "San Francisco, CA",
        notes: "Looking for a modern family home with at least 3 bedrooms.",
      },
      {
        name: "Noah Ramirez",
        phone: "+1-212-555-0148",
        email: "noah.ramirez@example.com",
        budget: 820000,
        preferredLocation: "New York, NY",
        notes: "Needs easy commute to midtown Manhattan.",
      },
      {
        name: "Chloe Nguyen",
        phone: "+1-305-555-0111",
        email: "chloe.nguyen@example.com",
        budget: 470000,
        preferredLocation: "Miami, FL",
        notes: "Interested in waterfront condos with a gym.",
      },
      {
        name: "Marcus Williams",
        phone: "+1-312-555-0188",
        email: "marcus.williams@example.com",
        budget: 950000,
        preferredLocation: "Chicago, IL",
        notes: "Looking for a penthouse in the downtown area.",
      },
      {
        name: "Emma Chen",
        phone: "+1-206-555-0131",
        email: "emma.chen@example.com",
        budget: 380000,
        preferredLocation: "Seattle, WA",
        notes: "First-time buyer, prefers a studio near tech hub.",
      },
      {
        name: "Liam Foster",
        phone: "+1-512-555-0176",
        email: "liam.foster@example.com",
        budget: 560000,
        preferredLocation: "Austin, TX",
        notes: "Remote worker seeking home office space.",
      },
    ],
  });

  const savedCustomers = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
  const [ava, noah, chloe, marcus, emma, liam] = savedCustomers;

  await prisma.property.createMany({
    data: [
      {
        title: "Bayview Modern Villa",
        description: "A luxurious villa with panoramic bay views and modern amenities. Ideal for families seeking space and style.",
        price: 1250000,
        city: "San Francisco",
        state: "CA",
        address: "123 Bay Street",
        propertyType: "VILLA",
        bhk: 4,
        bathrooms: 3,
        area: "3,200 sqft",
        amenities: JSON.stringify(["Pool", "Gym", "Parking", "Smart Home", "Terrace"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: true,
        listedById: agentUser.id,
      },
      {
        title: "Midtown Studio Loft",
        description: "A bright studio loft in the heart of the city with rooftop access and panoramic views.",
        price: 875000,
        city: "New York",
        state: "NY",
        address: "45 Central Park West",
        propertyType: "STUDIO",
        bhk: 1,
        bathrooms: 1,
        area: "850 sqft",
        amenities: JSON.stringify(["Rooftop", "Doorman", "Fitness Center", "Concierge"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: false,
        listedById: agentUser.id,
      },
      {
        title: "Miami Beach Apartment",
        description: "Turnkey apartment steps from the beach with ocean views and resort amenities.",
        price: 995000,
        city: "Miami",
        state: "FL",
        address: "210 Ocean Drive",
        propertyType: "APARTMENT",
        bhk: 2,
        bathrooms: 2,
        area: "1,450 sqft",
        amenities: JSON.stringify(["Beach Access", "Pool", "Gym", "Parking", "Valet"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: true,
        listedById: agentUser2.id,
      },
      {
        title: "Chicago Penthouse Suite",
        description: "Exclusive penthouse in downtown Chicago with floor-to-ceiling windows and private terrace.",
        price: 2200000,
        city: "Chicago",
        state: "IL",
        address: "900 Michigan Avenue",
        propertyType: "PENTHOUSE",
        bhk: 3,
        bathrooms: 3,
        area: "4,100 sqft",
        amenities: JSON.stringify(["Private Terrace", "Wine Cellar", "Smart Home", "Concierge", "Helipad Access"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: true,
        listedById: agentUser2.id,
      },
      {
        title: "Seattle Tech Hub Office",
        description: "Modern office space in the heart of Seattle's tech corridor, ideal for startups.",
        price: 4500,
        city: "Seattle",
        state: "WA",
        address: "700 Stewart Street",
        propertyType: "OFFICE",
        bhk: 0,
        bathrooms: 2,
        area: "2,800 sqft",
        amenities: JSON.stringify(["High-Speed Internet", "Meeting Rooms", "Parking", "24/7 Access"]),
        images: JSON.stringify([]),
        status: "FOR_RENT",
        featured: false,
        listedById: agentUser3.id,
      },
      {
        title: "Austin Hill Country Estate",
        description: "Sprawling estate with hill country views, pool, and guest quarters.",
        price: 890000,
        city: "Austin",
        state: "TX",
        address: "4200 Lake Travis Road",
        propertyType: "VILLA",
        bhk: 5,
        bathrooms: 4,
        area: "5,600 sqft",
        amenities: JSON.stringify(["Pool", "Guest House", "Gym", "Horse Barn", "Solar Panels"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: false,
        listedById: agentUser3.id,
      },
      {
        title: "Manhattan Luxury Hotel Suite",
        description: "A luxury hotel suite available for long-term corporate rentals.",
        price: 12000,
        city: "New York",
        state: "NY",
        address: "768 5th Avenue",
        propertyType: "HOTEL",
        bhk: 2,
        bathrooms: 2,
        area: "1,200 sqft",
        amenities: JSON.stringify(["Room Service", "Spa", "Concierge", "Parking", "Business Center"]),
        images: JSON.stringify([]),
        status: "FOR_RENT",
        featured: false,
        listedById: agentUser.id,
      },
      {
        title: "Malibu Oceanfront Loft",
        description: "Stunning loft with direct ocean access and private deck.",
        price: 1850000,
        city: "Malibu",
        state: "CA",
        address: "22100 Pacific Coast Hwy",
        propertyType: "LOFT",
        bhk: 2,
        bathrooms: 2,
        area: "1,900 sqft",
        amenities: JSON.stringify(["Ocean View", "Private Deck", "Fireplace", "Gourmet Kitchen"]),
        images: JSON.stringify([]),
        status: "SOLD",
        featured: false,
        listedById: agentUser.id,
      },
      {
        title: "Gota Residency Flat",
        description: "Cozy 2 BHK flat in Gota.",
        price: 4500000,
        city: "Ahmedabad",
        state: "Gujarat",
        address: "Gota",
        propertyType: "APARTMENT",
        bhk: 2,
        bathrooms: 2,
        area: "1000 sqft",
        amenities: JSON.stringify(["Parking", "Gym"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: true,
        listedById: agentUser.id,
      },
      {
        title: "Shreeji Heights Gota",
        description: "Beautiful 2 BHK apartment in Gota.",
        price: 5000000,
        city: "Ahmedabad",
        state: "Gujarat",
        address: "Gota",
        propertyType: "APARTMENT",
        bhk: 2,
        bathrooms: 2,
        area: "1000 sqft",
        amenities: JSON.stringify(["Parking", "Elevator"]),
        images: JSON.stringify([]),
        status: "FOR_SALE",
        featured: false,
        listedById: agentUser.id,
      },
    ],
  });

  const savedProperties = await prisma.property.findMany({ orderBy: { createdAt: "asc" } });
  const [bayview, midtown, miami, chicago, seattle, austin, manhattan, malibu] = savedProperties;

  await prisma.lead.createMany({
    data: [
      {
        customerId: ava.id,
        propertyId: bayview.id,
        status: "CONTACTED",
        source: "WEBSITE",
        notes: "Interested in a property tour next week.",
        assignedAgentId: agentUser.id,
      },
      {
        customerId: noah.id,
        propertyId: midtown.id,
        status: "QUALIFIED",
        source: "REFERRAL",
        notes: "Needs a quick move-in date. Pre-approved for mortgage.",
        assignedAgentId: agentUser.id,
      },
      {
        customerId: chloe.id,
        propertyId: miami.id,
        status: "NEW",
        source: "SOCIAL_MEDIA",
        notes: "Wants a showroom tour this weekend.",
        assignedAgentId: agentUser2.id,
      },
      {
        customerId: marcus.id,
        propertyId: chicago.id,
        status: "WON",
        source: "ADVERTISEMENT",
        notes: "Offer accepted. Moving to closing.",
        assignedAgentId: agentUser2.id,
      },
      {
        customerId: emma.id,
        propertyId: seattle.id,
        status: "CONTACTED",
        source: "WALK_IN",
        notes: "Toured the office. Interested in a 12-month lease.",
        assignedAgentId: agentUser3.id,
      },
      {
        customerId: liam.id,
        propertyId: austin.id,
        status: "QUALIFIED",
        source: "REFERRAL",
        notes: "Has financing. Wants to negotiate price.",
        assignedAgentId: agentUser3.id,
      },
      {
        customerId: ava.id,
        propertyId: malibu.id,
        status: "LOST",
        source: "WEBSITE",
        notes: "Budget did not align with listing price.",
        assignedAgentId: agentUser.id,
      },
    ],
  });

  await prisma.conversation.createMany({
    data: [
      {
        customerId: ava.id,
        messages: JSON.stringify([
          { from: "customer", text: "Do you have any available tours this Thursday?", timestamp: new Date().toISOString() },
          { from: "agent", text: "Yes, I can book you for Thursday at 10 AM.", timestamp: new Date().toISOString() },
          { from: "customer", text: "Perfect! Will the garden be accessible?", timestamp: new Date().toISOString() },
          { from: "agent", text: "Absolutely, the full property including garden and pool area will be open.", timestamp: new Date().toISOString() },
        ]),
        aiSummary: "Customer requested a Thursday tour. Agent confirmed 10 AM slot with full property access.",
      },
      {
        customerId: noah.id,
        messages: JSON.stringify([
          { from: "customer", text: "Can I see the Midtown Studio before the weekend?", timestamp: new Date().toISOString() },
          { from: "agent", text: "I can schedule a showing on Friday afternoon.", timestamp: new Date().toISOString() },
          { from: "customer", text: "What floor is the unit on?", timestamp: new Date().toISOString() },
          { from: "agent", text: "It's on the 18th floor with unobstructed Central Park views.", timestamp: new Date().toISOString() },
        ]),
        aiSummary: "Customer wants a weekend showing of the Midtown studio. Confirmed Friday afternoon with floor details.",
      },
      {
        customerId: chloe.id,
        messages: JSON.stringify([
          { from: "customer", text: "What are the HOA fees for the Miami Beach apartment?", timestamp: new Date().toISOString() },
          { from: "agent", text: "HOA fees are $650 per month and include pool access, gym, and beach access.", timestamp: new Date().toISOString() },
        ]),
        aiSummary: "Customer inquired about HOA fees. Agent provided $650/mo figure covering pool, gym, and beach access.",
      },
      {
        customerId: marcus.id,
        messages: JSON.stringify([
          { from: "customer", text: "I'd like to make an offer on the Chicago penthouse.", timestamp: new Date().toISOString() },
          { from: "agent", text: "Excellent choice! I'll prepare the offer documents. What's your opening price?", timestamp: new Date().toISOString() },
          { from: "customer", text: "I'm thinking $2.1M, all cash.", timestamp: new Date().toISOString() },
          { from: "agent", text: "Strong offer. I'll present it to the seller today. Expect a response within 24 hours.", timestamp: new Date().toISOString() },
        ]),
        aiSummary: "Customer submitted $2.1M all-cash offer on Chicago penthouse. Agent presenting to seller.",
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        customerId: ava.id,
        reviewerName: "Emily Parker",
        rating: 5,
        comment: "The team handled the entire process smoothly and found the perfect home quickly. Highly professional.",
      },
      {
        customerId: noah.id,
        reviewerName: "Aiden Brooks",
        rating: 4,
        comment: "Great communication and fast follow-up throughout the search. Minor delay on paperwork but overall great experience.",
      },
      {
        customerId: chloe.id,
        reviewerName: "Mia Johnson",
        rating: 5,
        comment: "Professional service and clear pricing details made the decision easy. Would recommend to friends.",
      },
      {
        customerId: marcus.id,
        reviewerName: "David Liu",
        rating: 5,
        comment: "Exceptional service. The agent found us our dream penthouse in just 2 weeks.",
      },
      {
        customerId: emma.id,
        reviewerName: "Sophie Turner",
        rating: 4,
        comment: "Very responsive and knowledgeable. Helped us navigate the market as first-time buyers.",
      },
    ],
  });

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 10, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        customerId: ava.id,
        propertyId: bayview.id,
        assignedAgentId: agentUser.id,
        scheduledAt: daysFromNow(1),
        status: "CONFIRMED",
        notes: "Initial walkthrough with the customer. Bring floor plans.",
      },
      {
        customerId: noah.id,
        propertyId: midtown.id,
        assignedAgentId: agentUser.id,
        scheduledAt: daysFromNow(3),
        status: "SCHEDULED",
        notes: "Follow-up tour before offer submission.",
      },
      {
        customerId: chloe.id,
        propertyId: miami.id,
        assignedAgentId: agentUser2.id,
        scheduledAt: daysFromNow(5),
        status: "SCHEDULED",
        notes: "Beachfront apartment viewing.",
      },
      {
        customerId: emma.id,
        propertyId: seattle.id,
        assignedAgentId: agentUser3.id,
        scheduledAt: daysFromNow(0),
        status: "CONFIRMED",
        notes: "Office lease negotiation meeting.",
      },
      {
        customerId: liam.id,
        propertyId: austin.id,
        assignedAgentId: agentUser3.id,
        scheduledAt: daysFromNow(7),
        status: "SCHEDULED",
        notes: "Full estate tour including guest house.",
      },
      {
        customerId: marcus.id,
        propertyId: chicago.id,
        assignedAgentId: agentUser2.id,
        scheduledAt: daysFromNow(-2),
        status: "COMPLETED",
        notes: "Pre-closing walkthrough completed successfully.",
      },
    ],
  });

  const monthlyRevenueData = [
    { month: -5, value: 142000 },
    { month: -4, value: 168000 },
    { month: -3, value: 155000 },
    { month: -2, value: 189000 },
    { month: -1, value: 174000 },
    { month: 0, value: 215000 },
  ];

  for (const entry of monthlyRevenueData) {
    const d = new Date();
    d.setMonth(d.getMonth() + entry.month);
    d.setDate(1);
    await prisma.analytics.create({
      data: {
        metric: "monthly_revenue",
        value: entry.value,
        recordedAt: d,
      },
    });
  }

  await prisma.analytics.createMany({
    data: [
      { metric: "new_leads", value: 42, recordedAt: new Date() },
      { metric: "customer_churn", value: 2.5, recordedAt: new Date() },
      { metric: "appointments_today", value: 3, recordedAt: new Date() },
      { metric: "agent_performance", value: 89.7, recordedAt: new Date() },
      { metric: "conversion_rate", value: 28.4, recordedAt: new Date() },
    ],
  });

  console.log("✅ Seed data created successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
