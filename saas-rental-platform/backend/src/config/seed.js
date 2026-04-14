require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(schema);
  console.log('Schema created/verified');
}

async function seed() {
  try {
    await runSchema();

    // Clear tables in order (respect FK constraints)
    await db.query('TRUNCATE notifications, invoice_items, invoices, quote_items, quotes, tasks, project_crew, project_equipment, equipment_logs, crew_availability, crew_members, projects, communication_logs, clients, equipment, users RESTART IDENTITY CASCADE');
    console.log('Tables cleared');

    // --- Users ---
    const passwordHash = await bcrypt.hash('password123', 10);
    const usersResult = await db.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
        ('Admin User', 'admin@rentpro.com', $1, 'admin'),
        ('Sarah Manager', 'sarah@rentpro.com', $1, 'manager'),
        ('Tom Crew', 'tom@rentpro.com', $1, 'crew_member'),
        ('Lisa Crew', 'lisa@rentpro.com', $1, 'crew_member')
      RETURNING id, name, role
    `, [passwordHash]);
    const users = usersResult.rows;
    console.log('Users seeded:', users.map(u => u.name));

    // --- Clients ---
    const clientsResult = await db.query(`
      INSERT INTO clients (name, company, email, phone, address, city, country, notes) VALUES
        ('James Wilson', 'Wilson Events Co.', 'james@wilsonevents.com', '+1-555-0101', '123 Main St', 'New York', 'US', 'Premium client, always pays on time'),
        ('Emma Davis', 'Bright Stage Productions', 'emma@brightstage.com', '+1-555-0102', '456 Oak Ave', 'Los Angeles', 'US', 'Prefers detailed itemized quotes'),
        ('Michael Chen', 'Chen Media Group', 'mchen@chenmedia.com', '+1-555-0103', '789 Pine Rd', 'Chicago', 'US', 'Corporate events, large budgets'),
        ('Sofia Rodriguez', 'Sol Festivals', 'sofia@solfestivals.com', '+1-555-0104', '321 Sunset Blvd', 'Miami', 'US', 'Annual summer festival client'),
        ('David Kim', 'Kim Weddings & Events', 'david@kimevents.com', '+1-555-0105', '654 Elm St', 'Seattle', 'US', 'High-end weddings and private events')
      RETURNING id, name
    `);
    const clients = clientsResult.rows;
    console.log('Clients seeded:', clients.map(c => c.name));

    // --- Equipment ---
    const equipmentResult = await db.query(`
      INSERT INTO equipment (name, category, quantity, available_quantity, condition, location, description, daily_rate, serial_number) VALUES
        ('LED Par Can Light', 'Lighting', 20, 18, 'excellent', 'Warehouse A', 'Professional LED PAR can, RGBW, DMX controlled', 25.00, 'LED-PAR-001'),
        ('Moving Head Beam', 'Lighting', 8, 6, 'good', 'Warehouse A', 'Sharpy-style moving head beam light, 230W', 75.00, 'MHB-001'),
        ('Truss Section 2m', 'Rigging', 30, 25, 'good', 'Warehouse B', 'Heavy duty aluminium box truss, 2m sections', 15.00, 'TRUSS-2M-001'),
        ('Audio Mixer 32ch', 'Audio', 3, 2, 'excellent', 'Warehouse A', 'Professional 32-channel digital audio mixer', 150.00, 'MIX-32-001'),
        ('Line Array Speaker', 'Audio', 16, 12, 'good', 'Warehouse A', 'Professional line array speaker element, 12" woofer', 80.00, 'LAS-001'),
        ('Subwoofer 18"', 'Audio', 8, 6, 'good', 'Warehouse A', 'Professional 18" subwoofer, 2000W', 60.00, 'SUB-18-001'),
        ('LED Video Wall Panel', 'Video', 24, 20, 'excellent', 'Warehouse C', 'P3.91 indoor LED video wall panel, 500x500mm', 45.00, 'VWP-001'),
        ('Video Switcher', 'Video', 2, 2, 'excellent', 'Warehouse C', 'Professional broadcast video switcher, 4K', 200.00, 'VS-001'),
        ('Generator 20kVA', 'Power', 4, 3, 'good', 'Outdoor Storage', 'Silent diesel generator, 20kVA, 3-phase', 120.00, 'GEN-20K-001'),
        ('Stage Platform 2x1m', 'Staging', 40, 35, 'fair', 'Warehouse B', 'Modular stage platform, 2m x 1m, adjustable height', 20.00, 'STG-2X1-001')
      RETURNING id, name
    `);
    const equipment = equipmentResult.rows;
    console.log('Equipment seeded:', equipment.map(e => e.name));

    // --- Crew Members ---
    const crewResult = await db.query(`
      INSERT INTO crew_members (name, email, phone, role, skills, hourly_rate, is_available, notes) VALUES
        ('Alex Turner', 'alex@rentpro.com', '+1-555-0201', 'Lighting Tech', ARRAY['DMX Programming', 'Rigging', 'LED Fixtures'], 45.00, true, 'Certified rigger, 8 years experience'),
        ('Maria Santos', 'maria@rentpro.com', '+1-555-0202', 'Audio Engineer', ARRAY['Live Sound', 'FOH', 'Monitor Engineering', 'Recording'], 55.00, true, 'FOH specialist for large concerts'),
        ('Jake Robinson', 'jake@rentpro.com', '+1-555-0203', 'Video Tech', ARRAY['LED Video Walls', 'Camera Operation', 'Broadcast', 'Streaming'], 50.00, true, 'Experienced with large LED installs'),
        ('Priya Patel', 'priya@rentpro.com', '+1-555-0204', 'Stage Manager', ARRAY['Stage Management', 'Production Coordination', 'Crew Management'], 60.00, false, 'Currently on leave until next month')
      RETURNING id, name
    `);
    const crew = crewResult.rows;
    console.log('Crew seeded:', crew.map(c => c.name));

    // --- Projects ---
    const now = new Date();
    const projectsResult = await db.query(`
      INSERT INTO projects (name, client_id, status, start_date, end_date, description, location, budget, total_revenue, created_by) VALUES
        ('Summer Music Festival 2024', $1, 'confirmed', $5, $6, 'Annual outdoor music festival featuring 3 stages and 20+ artists', 'Central Park, New York', 85000.00, 72500.00, $4),
        ('Corporate Gala Dinner - Tech Summit', $2, 'in_progress', $7, $8, 'Black-tie corporate gala for 500 guests with AV presentation', 'Marriott Grand Ballroom, LA', 32000.00, 28900.00, $4),
        ('Kim Wedding Reception', $3, 'completed', $9, $10, 'Luxury wedding reception with full lighting and audio production', 'The Ritz, Chicago', 18500.00, 18500.00, $4)
      RETURNING id, name
    `, [
      clients[3].id, clients[2].id, clients[4].id, users[0].id,
      new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString(),
      new Date(now.getFullYear(), now.getMonth() + 1, 17).toISOString(),
      new Date(now.getFullYear(), now.getMonth(), 20).toISOString(),
      new Date(now.getFullYear(), now.getMonth(), 21).toISOString(),
      new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString(),
      new Date(now.getFullYear(), now.getMonth() - 1, 6).toISOString(),
    ]);
    const projects = projectsResult.rows;
    console.log('Projects seeded:', projects.map(p => p.name));

    // --- Project Equipment ---
    await db.query(`
      INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate) VALUES
        ($1, $4, 12, 25.00), ($1, $5, 4, 75.00), ($1, $6, 8, 80.00),
        ($2, $4, 6, 25.00), ($2, $7, 1, 150.00),
        ($3, $4, 8, 25.00), ($3, $7, 1, 150.00)
    `, [
      projects[0].id, projects[1].id, projects[2].id,
      equipment[0].id, equipment[1].id, equipment[4].id,
      equipment[3].id, equipment[4].id
    ]);

    // --- Project Crew ---
    await db.query(`
      INSERT INTO project_crew (project_id, crew_id, role, hours, hourly_rate) VALUES
        ($1, $4, 'Lead Lighting Tech', 24, 45.00),
        ($1, $5, 'FOH Engineer', 24, 55.00),
        ($2, $4, 'Lighting Designer', 12, 50.00),
        ($2, $6, 'Video Tech', 12, 50.00),
        ($3, $4, 'Lighting Tech', 8, 45.00),
        ($3, $5, 'Audio Engineer', 8, 55.00)
    `, [
      projects[0].id, projects[1].id, projects[2].id,
      crew[0].id, crew[1].id, crew[2].id
    ]);

    // --- Tasks ---
    await db.query(`
      INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to) VALUES
        ($1, 'Confirm stage dimensions', 'Get final stage plot from venue', 'done', 'high', NOW() - INTERVAL '5 days', $4),
        ($1, 'Deliver truss and lighting', 'Load out from warehouse and transport to site', 'in_progress', 'high', NOW() + INTERVAL '10 days', $4),
        ($1, 'Program lighting show', 'Pre-program all cue lists for 3 stages', 'todo', 'medium', NOW() + INTERVAL '12 days', $4),
        ($2, 'AV setup walkthrough', 'Meet venue AV team for initial walkthrough', 'done', 'high', NOW() - INTERVAL '2 days', $5),
        ($2, 'Presentation slide deck check', 'Review all presenter slides for compatibility', 'in_progress', 'medium', NOW() + INTERVAL '1 day', $5)
      RETURNING id
    `, [projects[0].id, projects[1].id, users[0].id, users[1].id]);

    // --- Quotes ---
    const quotesResult = await db.query(`
      INSERT INTO quotes (project_id, client_id, quote_number, status, valid_until, subtotal, tax_rate, tax_amount, total, notes, created_by) VALUES
        ($1, $3, 'QT-2024-001', 'accepted', NOW() + INTERVAL '30 days', 65000.00, 8.5, 5525.00, 70525.00, 'Full production package for festival', $5),
        ($2, $4, 'QT-2024-002', 'sent', NOW() + INTERVAL '14 days', 26000.00, 8.5, 2210.00, 28210.00, 'Corporate AV package', $5),
        (NULL, $3, 'QT-2024-003', 'draft', NOW() + INTERVAL '30 days', 15000.00, 8.5, 1275.00, 16275.00, 'Proposed additional lighting upgrade', $5)
      RETURNING id
    `, [projects[0].id, projects[1].id, clients[3].id, clients[2].id, users[0].id]);
    const quotes = quotesResult.rows;

    // --- Quote Items ---
    await db.query(`
      INSERT INTO quote_items (quote_id, description, type, quantity, unit_price, total) VALUES
        ($1, 'LED Par Can Light (3 days x 12 units)', 'equipment', 36, 25.00, 900.00),
        ($1, 'Moving Head Beam (3 days x 4 units)', 'equipment', 12, 75.00, 900.00),
        ($1, 'Line Array Speaker (3 days x 8 units)', 'equipment', 24, 80.00, 1920.00),
        ($1, 'Lighting Tech - Alex Turner (24hrs)', 'crew', 24, 45.00, 1080.00),
        ($1, 'Audio Engineer - Maria Santos (24hrs)', 'crew', 24, 55.00, 1320.00),
        ($2, 'LED Par Can Light (2 days x 6 units)', 'equipment', 12, 25.00, 300.00),
        ($2, 'Audio Mixer 32ch (2 days)', 'equipment', 2, 150.00, 300.00),
        ($2, 'Video Tech - Jake Robinson (12hrs)', 'crew', 12, 50.00, 600.00)
    `, [quotes[0].id, quotes[1].id]);

    // --- Invoices ---
    await db.query(`
      INSERT INTO invoices (project_id, client_id, quote_id, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, amount_paid, notes, created_by) VALUES
        ($1, $4, $6, 'INV-2024-001', 'paid', NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days', 65000.00, 8.5, 5525.00, 70525.00, 70525.00, 'Festival production - PAID IN FULL', $7),
        ($2, $5, $8, 'INV-2024-002', 'sent', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 26000.00, 8.5, 2210.00, 28210.00, 0.00, 'Corporate gala AV package', $7),
        (NULL, $3, NULL, 'INV-2024-003', 'overdue', NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', 8500.00, 8.5, 722.50, 9222.50, 0.00, 'Previous booking - OVERDUE', $7)
      RETURNING id
    `, [projects[2].id, projects[1].id, clients[4].id, clients[3].id, clients[2].id, quotes[0].id, quotes[1].id, users[0].id]);

    // --- Communication Logs ---
    await db.query(`
      INSERT INTO communication_logs (client_id, type, subject, content, created_by) VALUES
        ($1, 'email', 'Festival Quote Sent', 'Sent detailed quote QT-2024-001 for the summer festival production.', $3),
        ($1, 'call', 'Follow-up call', 'Discussed lighting requirements, client happy with proposal.', $3),
        ($2, 'meeting', 'Site Visit', 'Visited venue to assess AV requirements for corporate gala.', $4),
        ($2, 'email', 'Contract Signed', 'Client signed service agreement. Deposit received.', $4),
        ($5, 'note', 'New Lead', 'Referred by Wilson Events. Interested in annual festival production.', $3)
      RETURNING id
    `, [clients[3].id, clients[2].id, users[0].id, users[1].id, clients[0].id]);

    // --- Notifications ---
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
        ($1, 'project_update', 'Project Status Updated', 'Corporate Gala Dinner is now In Progress', false),
        ($1, 'invoice_overdue', 'Invoice Overdue', 'INV-2024-003 is 15 days overdue - $9,222.50', false),
        ($1, 'quote_accepted', 'Quote Accepted', 'QT-2024-001 has been accepted by Sofia Rodriguez', true),
        ($2, 'task_assigned', 'New Task Assigned', 'You have been assigned: AV setup walkthrough', false)
      RETURNING id
    `, [users[0].id, users[1].id]);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest accounts:');
    console.log('  Admin: admin@rentpro.com / password123');
    console.log('  Manager: sarah@rentpro.com / password123');
    console.log('  Crew: tom@rentpro.com / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
