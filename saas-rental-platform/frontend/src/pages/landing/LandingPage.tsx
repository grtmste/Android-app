import { Link } from 'react-router-dom';
import {
  Zap, CheckCircle, ArrowRight, Star, Play, ChevronRight,
  Package, Users, Calendar, FileText, BarChart3, Shield,
  Music, Camera, Lightbulb, Truck, Building2, Clapperboard,
  Twitter, Linkedin, Youtube, Globe, Phone, Mail
} from 'lucide-react';

const features = [
  { icon: Package, title: 'Equipment Management', desc: 'Track every item in your inventory — availability, condition, and location in real time.' },
  { icon: Calendar, title: 'Crew Scheduling', desc: 'Build crew schedules with drag-and-drop, filter by skills and availability.' },
  { icon: FileText, title: 'Quotes & Invoices', desc: 'Create professional quotes and invoices, export to PDF, and track payment status.' },
  { icon: Users, title: 'Client CRM', desc: 'Maintain a full client history with communication logs and booking records.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Revenue charts, utilization rates, and crew hour logs at your fingertips.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Admin, Manager, and Crew roles with fine-grained permissions.' },
];

const industries = [
  { icon: Music, title: 'Concerts & Festivals', desc: 'Manage stages, lighting rigs, and audio systems for large-scale events.' },
  { icon: Camera, title: 'Film & TV Production', desc: 'Track camera equipment, grip gear, and production crew scheduling.' },
  { icon: Lightbulb, title: 'Corporate Events', desc: 'AV equipment management for conferences, galas, and product launches.' },
  { icon: Truck, title: 'Equipment Rental', desc: 'Full rental lifecycle from booking to return, with check-in/out logs.' },
  { icon: Building2, title: 'Venues & Venues', desc: 'Manage in-house inventory and coordinate with external suppliers.' },
  { icon: Clapperboard, title: 'Theater & Performing Arts', desc: 'Stage management, lighting design, and crew coordination.' },
];

const deepFeatures = [
  {
    title: 'Real-Time Inventory Tracking',
    desc: 'Know exactly where every piece of equipment is, its condition, and availability. Check equipment in and out with a single click, and automatically update availability across all bookings.',
    img: 'https://placehold.co/600x400/1A3C6E/FFFFFF?text=Inventory+Dashboard',
    badge: 'Inventory',
  },
  {
    title: 'Visual Crew Scheduler',
    desc: 'See your whole crew on a timeline. Drag and drop assignments, filter by skill or availability, and send instant schedule updates to your team. Never double-book a crew member again.',
    img: 'https://placehold.co/600x400/F97316/FFFFFF?text=Crew+Schedule',
    badge: 'Scheduling',
    reverse: true,
  },
  {
    title: 'Project-Centric Workflow',
    desc: 'Every event is a project. Link clients, equipment, crew, quotes, and invoices together. Track the full lifecycle from Draft to Completed with status workflows and task management.',
    img: 'https://placehold.co/600x400/1A3C6E/FFFFFF?text=Project+View',
    badge: 'Projects',
  },
  {
    title: 'Professional Quoting',
    desc: 'Generate beautiful, itemized quotes in seconds. Add equipment rental lines, crew costs, and services. Send directly to clients and convert accepted quotes to invoices with one click.',
    img: 'https://placehold.co/600x400/F97316/FFFFFF?text=Quote+Builder',
    badge: 'Quotes',
    reverse: true,
  },
  {
    title: 'Revenue Analytics',
    desc: 'Understand your business with charts covering monthly revenue, equipment utilization rates, top clients, and crew hours logged. Make data-driven decisions to grow your rental business.',
    img: 'https://placehold.co/600x400/1A3C6E/FFFFFF?text=Analytics+Charts',
    badge: 'Analytics',
  },
];

const logos = ['Stage Co', 'Event Pro', 'SoundWave', 'LightMasters', 'CinePro', 'FestivalAV', 'TrussWorks', 'CrewLink'];

const whyUs = [
  { title: 'Built for Rentals', desc: 'Every feature designed specifically for equipment rental and event production businesses.' },
  { title: 'All-in-One Platform', desc: 'Replace 5 different tools with one platform. No more switching between spreadsheets and apps.' },
  { title: 'Mobile-Friendly', desc: 'Works on phones and tablets so your crew can check equipment in/out from anywhere on site.' },
  { title: 'Scales with You', desc: 'Whether you have 50 items or 5,000, RentPro scales with your business.' },
  { title: 'Real-Time Updates', desc: 'Changes sync instantly across your whole team — no stale data, no missed updates.' },
  { title: 'Dedicated Support', desc: '24/7 support from a team that understands the event industry.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-primary-500 font-bold text-xl">RentPro</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Industries', 'Pricing', 'About'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-gray-600 hover:text-primary-500 text-sm font-medium transition-colors">
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors px-3 py-2">
                Log In
              </Link>
              <Link to="/register" className="bg-accent-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent-600 transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-20 pb-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC4yIiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full mb-6 border border-white/20">
            <Star className="w-4 h-4 text-accent-400 fill-accent-400" />
            <span>Trusted by 2,000+ rental companies worldwide</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Manage Equipment,<br />
            <span className="text-accent-400">Crew & Events</span><br />
            Effortlessly
          </h1>

          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            The all-in-one platform for equipment rental companies, event producers, and AV professionals. From inventory to invoices — everything in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/register"
              className="bg-accent-500 text-white font-semibold px-8 py-4 rounded-xl hover:bg-accent-600 transition-all transform hover:scale-105 shadow-lg shadow-accent-500/30 flex items-center gap-2 text-lg"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="bg-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all border border-white/20 flex items-center gap-2 text-lg backdrop-blur">
              <Play className="w-5 h-5" /> Watch Demo
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-blue-200 text-sm">
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-accent-400" /> {item}
              </span>
            ))}
          </div>

          {/* Hero image placeholder */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
              <img
                src="https://placehold.co/1200x600/F8FAFC/1A3C6E?text=RentPro+Dashboard+Preview"
                alt="RentPro Dashboard"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Logo bar */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm font-medium mb-8">TRUSTED BY LEADING EVENT COMPANIES</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo) => (
              <div key={logo} className="text-gray-400 font-bold text-lg tracking-tight hover:text-gray-600 transition-colors">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-column Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-accent-500 font-semibold text-sm uppercase tracking-wider">Everything You Need</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Built for the Event Industry</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Stop juggling spreadsheets and disconnected tools. RentPro brings every part of your business together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-primary-100 transition-all group">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
                  <Icon className="w-6 h-6 text-primary-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep feature sections (alternating) */}
      <section className="py-8">
        {deepFeatures.map((f, i) => (
          <div key={f.title} className={`py-16 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className={`flex flex-col lg:flex-row items-center gap-12 ${f.reverse ? 'lg:flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <span className="inline-block bg-accent-100 text-accent-600 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                    {f.badge}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{f.title}</h2>
                  <p className="text-gray-500 text-lg leading-relaxed mb-6">{f.desc}</p>
                  <Link to="/register" className="inline-flex items-center gap-2 text-primary-500 font-semibold hover:gap-3 transition-all">
                    Get started free <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
                <div className="flex-1">
                  <img src={f.img} alt={f.title} className="rounded-2xl shadow-xl w-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Industries */}
      <section id="industries" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-accent-500 font-semibold text-sm uppercase tracking-wider">Industries We Serve</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Built for Every Event Professional</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-accent-200 transition-all group cursor-pointer">
                <Icon className="w-8 h-8 text-accent-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-24 bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-accent-400 font-semibold text-sm uppercase tracking-wider">Why RentPro?</span>
            <h2 className="text-4xl font-extrabold text-white mt-3 mb-4">The Smarter Choice for Rental Businesses</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map(({ title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-r from-accent-500 to-accent-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Ready to transform your rental business?
          </h2>
          <p className="text-orange-100 text-xl mb-8">
            Join thousands of event professionals who trust RentPro. Start your free 14-day trial — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-accent-500 font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-all shadow-lg text-lg inline-flex items-center gap-2 justify-center"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-lg inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">RentPro</span>
              </div>
              <p className="text-sm leading-relaxed">The all-in-one platform for equipment rental and event production management.</p>
              <div className="flex gap-3 mt-4">
                {[Twitter, Linkedin, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <Icon className="w-4 h-4 text-gray-300" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap', 'Status'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Partners', 'Press'] },
              { title: 'Support', links: ['Documentation', 'Help Center', 'Community', 'API Docs', 'Contact'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-white font-semibold mb-4">{title}</h4>
                <ul className="space-y-2">
                  {links.map(l => (
                    <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-800 gap-4">
            <p className="text-sm">© {new Date().getFullYear()} RentPro Inc. All rights reserved.</p>
            <div className="flex gap-4 text-sm">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm"><Globe className="w-4 h-4" /> English</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
