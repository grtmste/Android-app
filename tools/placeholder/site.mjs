/**
 * Placeholder site spec, used ONLY when scrape/content.json is missing or empty (e.g. the
 * crawl was blocked). The copy is deliberately instructional ("Introduce …") so nobody
 * mistakes it for real modafie.io content. Images come from make_images.py and are
 * labelled "PLACEHOLDER IMAGE".
 */
export const placeholderSite = {
  source: 'placeholder',
  site: { name: 'Modafie', tagline: '' },
  announcement: [
    { text: 'Announcement bar: add your shipping or launch message' },
    { text: 'Edit in Appearance → Customize → Modafie Theme' },
  ],
  menus: {
    primary: [
      {
        title: 'Collections',
        page: 'collections',
        classes: 'mf-mega',
        children: [
          { title: 'Featured', page: 'collections', children: [{ title: 'New in', url: '{{mf:page-url:collections}}#new-in' }, { title: 'Best sellers', url: '{{mf:page-url:collections}}#best-sellers' }, { title: 'All collections', page: 'collections' }] },
          { title: 'Categories', page: 'collections', children: [{ title: 'Category one', url: '{{mf:page-url:collections}}' }, { title: 'Category two', url: '{{mf:page-url:collections}}' }, { title: 'Category three', url: '{{mf:page-url:collections}}' }, { title: 'Category four', url: '{{mf:page-url:collections}}' }] },
          { title: 'Discover', page: 'about', children: [{ title: 'About', page: 'about' }, { title: 'FAQ', page: 'faq' }, { title: 'Contact', page: 'contact' }] },
          { title: 'Shop new in', page: 'collections', classes: 'mf-mega-promo', description: '{{mf:media-url:tile-1.jpg}}' },
        ],
      },
      { title: 'About', page: 'about' },
      { title: 'FAQ', page: 'faq' },
      { title: 'Contact', page: 'contact' },
    ],
    utility: [{ title: 'Help', page: 'faq' }],
    footer: [{ title: 'FAQ', page: 'faq' }, { title: 'Contact', page: 'contact' }],
    social: [],
  },
  footer: {
    brand: 'Modafie',
    text: 'Footer intro: one or two lines about the brand. Edit this template under Templates → Saved Templates → “Site Footer”.',
    newsletter: { placeholder: 'Email address', button: 'Sign up' },
    columns: [
      { title: 'Explore', links: [{ text: 'Collections', href: '{{mf:page-url:collections}}' }, { text: 'About', href: '{{mf:page-url:about}}' }] },
      { title: 'Help', links: [{ text: 'FAQ', href: '{{mf:page-url:faq}}' }, { text: 'Contact', href: '{{mf:page-url:contact}}' }] },
      { title: 'Company', links: [{ text: 'About', href: '{{mf:page-url:about}}' }, { text: 'Home', href: '{{mf:home-url}}' }] },
    ],
  },
  pages: [
    {
      slug: 'home',
      title: 'Home',
      front: true,
      description: 'Placeholder homepage. Re-build the demo package from the modafie.io crawl to replace this.',
      sections: [
        { pattern: 'hero', eyebrow: 'Hero eyebrow', heading: 'Your headline goes here', text: 'Introduce the brand or the latest drop in one or two short lines.', image: 'hero-home.jpg', imageMobile: 'hero-home-mobile.jpg', buttons: [{ text: 'Primary action', href: '{{mf:page-url:collections}}' }, { text: 'Secondary', href: '{{mf:page-url:about}}' }] },
        { pattern: 'marquee', items: ['Ticker message one', 'Ticker message two', 'Ticker message three'] },
        { pattern: 'tiles', eyebrow: 'Shop by category', heading: 'Category tiles', items: [1, 2, 3, 4].map((i) => ({ label: `Category ${i}`, image: `tile-${i}.jpg`, href: '{{mf:page-url:collections}}', button: 'Shop now' })) },
        { pattern: 'rail', eyebrow: 'Horizontal rail', heading: 'New in', link: { text: 'View all', href: '{{mf:page-url:collections}}' }, items: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ image: `card-${i}.jpg`, title: `Card title ${i}`, meta: 'Short supporting detail', href: '{{mf:page-url:collections}}', badge: i <= 2 ? 'New' : '' })) },
        { pattern: 'split', eyebrow: 'Split section', heading: 'Tell the story in two columns', text: 'Pair a strong image with a few sentences about craft, materials or mission. The image side bleeds to the edge; the sides alternate down the page.', image: 'split-1.jpg', buttons: [{ text: 'Learn more', href: '{{mf:page-url:about}}' }] },
        { pattern: 'editorial', eyebrow: 'Editorial', heading: 'A big editorial moment', text: 'Full-bleed photography with a short line of copy.', image: 'editorial-1.jpg', buttons: [{ text: 'Explore', href: '{{mf:page-url:collections}}' }] },
        { pattern: 'features', heading: 'Why choose us', eyebrow: 'Features', surface: true, items: [{ title: 'Benefit one', text: 'One sentence that supports this point.' }, { title: 'Benefit two', text: 'One sentence that supports this point.' }, { title: 'Benefit three', text: 'One sentence that supports this point.' }, { title: 'Benefit four', text: 'One sentence that supports this point.' }] },
        { pattern: 'newsletter', heading: 'Join the newsletter', text: 'Short invitation to subscribe.', placeholder: 'Email address', button: 'Sign up', consent: 'Add your privacy note here.' },
      ],
    },
    {
      slug: 'about',
      title: 'About',
      description: 'Placeholder about page.',
      sections: [
        { pattern: 'hero', height: 'medium', eyebrow: 'About', heading: 'About headline', text: 'One line that sums up the brand.', image: 'hero-about.jpg', buttons: [] },
        { pattern: 'text', eyebrow: 'Our story', heading: 'Introduce the brand', text: 'Use this block for two or three short paragraphs about where the brand comes from and what it stands for.\n\nKeep sentences short. The column is limited to a comfortable reading width.', lead: true },
        { pattern: 'split', eyebrow: 'Chapter one', heading: 'First chapter', text: 'Describe a value, a process or a milestone.', image: 'split-2.jpg', buttons: [] },
        { pattern: 'split', eyebrow: 'Chapter two', heading: 'Second chapter', text: 'Describe another value, a process or a milestone.', image: 'split-3.jpg', reverse: true, surface: true, buttons: [{ text: 'Get in touch', href: '{{mf:page-url:contact}}' }] },
        { pattern: 'editorial', heading: 'Editorial statement', image: 'editorial-2.jpg', align: 'center', buttons: [] },
        { pattern: 'features', heading: 'What we believe', items: [{ title: 'Value one', text: 'Explain this value in a sentence.' }, { title: 'Value two', text: 'Explain this value in a sentence.' }, { title: 'Value three', text: 'Explain this value in a sentence.' }] },
      ],
    },
    {
      slug: 'collections',
      title: 'Collections',
      description: 'Placeholder collections page.',
      sections: [
        { pattern: 'hero', height: 'small', eyebrow: 'Collections', heading: 'Collections', text: 'Introduce the range.', image: 'hero-collections.jpg', buttons: [] },
        { pattern: 'tiles', heading: 'Browse by category', items: [1, 2, 3, 4].map((i) => ({ label: `Category ${i}`, image: `tile-${i}.jpg`, href: '#', button: 'View' })) },
        { pattern: 'rail', anchor: 'new-in', eyebrow: 'Latest', heading: 'New in', items: [1, 2, 3, 4, 5, 6].map((i) => ({ image: `card-${i}.jpg`, title: `Item ${i}`, meta: 'Supporting detail', href: '#' })) },
        { pattern: 'rail', anchor: 'best-sellers', eyebrow: 'Popular', heading: 'Best sellers', items: [8, 7, 6, 5, 4, 3].map((i) => ({ image: `card-${i}.jpg`, title: `Item ${i}`, meta: 'Supporting detail', href: '#' })) },
        { pattern: 'newsletter', heading: 'Be first to know', text: 'Short invitation to subscribe.', button: 'Sign up' },
      ],
    },
    {
      slug: 'faq',
      title: 'FAQ',
      description: 'Placeholder FAQ page.',
      sections: [
        { pattern: 'text', h1: true, compact: true, eyebrow: 'Help', heading: 'Frequently asked questions', text: 'Answers to common questions.' },
        { pattern: 'faq', heading: 'General', items: [1, 2, 3, 4, 5].map((i) => ({ q: `Question ${i}?`, a: '<p>Write a clear, short answer here. Link to related pages where helpful.</p>' })) },
        { pattern: 'text', surface: true, heading: 'Still have questions?', text: 'We are happy to help.', buttons: [{ text: 'Contact us', href: '{{mf:page-url:contact}}' }] },
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      description: 'Placeholder contact page.',
      sections: [
        { pattern: 'text', h1: true, compact: true, eyebrow: 'Contact', heading: 'Get in touch', text: 'Tell visitors how and when you reply.' },
        { pattern: 'contact', eyebrow: 'Write to us', heading: 'Send a message', text: 'Fill in the form and the message is emailed to the site administrator.', details: [{ text: 'email@example.com', icon: 'fas fa-envelope' }, { text: 'Add a phone number', icon: 'fas fa-phone' }, { text: 'Add an address', icon: 'fas fa-map-marker-alt' }], submit: 'Send message' },
      ],
    },
  ],
};
