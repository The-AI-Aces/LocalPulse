import { createContext, useContext, useState } from 'react'

const translations = {
  en: {
    appName: 'LocalPulse',
    feed: 'Feed',
    report: 'Report',
    events: 'Events',
    directory: 'Directory',
    profile: 'Profile',
    communityFeed: 'Community Feed',
    reportIssue: 'Report an Issue',
    category: 'Category',
    description: 'Description',
    submit: 'Submit Issue',
    search: 'Search',
    useMyLocation: 'Use My Location',
    sortBy: 'Sort by',
    mostRecent: 'Most recent',
    mostUpvoted: 'Most upvoted',
    radius: 'Radius',
    noIssues: 'No issues reported in this area yet.',
    comments: 'Comments',
    postComment: 'Post',
    addComment: 'Add a comment...',
    noComments: 'No comments yet.',
    open: 'Open',
    underReview: 'Under Review',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    authorityLogin: 'Authority Login',
    logOut: 'Log out',
    localEvents: 'Local Events & Announcements',
    postEvent: 'Post an Event',
    serviceProviders: 'Local Service Providers',
    addListing: 'Add a Listing',
    notifications: 'Notifications',
    noNotifications: 'No notifications yet.',
  },
  hi: {
    appName: 'लोकलपल्स',
    feed: 'फ़ीड',
    report: 'रिपोर्ट करें',
    events: 'कार्यक्रम',
    directory: 'निर्देशिका',
    profile: 'प्रोफ़ाइल',
    communityFeed: 'सामुदायिक फ़ीड',
    reportIssue: 'समस्या दर्ज करें',
    category: 'श्रेणी',
    description: 'विवरण',
    submit: 'समस्या सबमिट करें',
    search: 'खोजें',
    useMyLocation: 'मेरी लोकेशन उपयोग करें',
    sortBy: 'क्रमबद्ध करें',
    mostRecent: 'सबसे नया',
    mostUpvoted: 'सबसे अधिक वोट',
    radius: 'दूरी',
    noIssues: 'इस क्षेत्र में अभी तक कोई समस्या दर्ज नहीं हुई।',
    comments: 'टिप्पणियाँ',
    postComment: 'पोस्ट करें',
    addComment: 'टिप्पणी जोड़ें...',
    noComments: 'अभी कोई टिप्पणी नहीं।',
    open: 'खुला',
    underReview: 'समीक्षा में',
    inProgress: 'प्रगति में',
    resolved: 'हल हो गया',
    authorityLogin: 'प्राधिकरण लॉगिन',
    logOut: 'लॉग आउट',
    localEvents: 'स्थानीय कार्यक्रम और सूचनाएं',
    postEvent: 'कार्यक्रम पोस्ट करें',
    serviceProviders: 'स्थानीय सेवा प्रदाता',
    addListing: 'लिस्टिंग जोड़ें',
    notifications: 'सूचनाएं',
    noNotifications: 'अभी कोई सूचना नहीं।',
  },
  mr: {
    appName: 'लोकलपल्स',
    feed: 'फीड',
    report: 'तक्रार करा',
    events: 'कार्यक्रम',
    directory: 'निर्देशिका',
    profile: 'प्रोफाइल',
    communityFeed: 'सामुदायिक फीड',
    reportIssue: 'समस्या नोंदवा',
    category: 'श्रेणी',
    description: 'वर्णन',
    submit: 'तक्रार सबमिट करा',
    search: 'शोधा',
    useMyLocation: 'माझे स्थान वापरा',
    sortBy: 'क्रमवारी',
    mostRecent: 'सर्वात नवीन',
    mostUpvoted: 'सर्वाधिक मतदान',
    radius: 'परिसर',
    noIssues: 'या भागात अद्याप कोणतीही समस्या नोंदवली नाही.',
    comments: 'टिप्पण्या',
    postComment: 'पोस्ट करा',
    addComment: 'टिप्पणी जोडा...',
    noComments: 'अद्याप टिप्पण्या नाहीत.',
    open: 'उघडे',
    underReview: 'पुनरावलोकनात',
    inProgress: 'प्रगतीत',
    resolved: 'निराकरण झाले',
    authorityLogin: 'अधिकारी लॉगिन',
    logOut: 'लॉग आउट',
    localEvents: 'स्थानिक कार्यक्रम आणि घोषणा',
    postEvent: 'कार्यक्रम पोस्ट करा',
    serviceProviders: 'स्थानिक सेवा पुरवठादार',
    addListing: 'लिस्टिंग जोडा',
    notifications: 'सूचना',
    noNotifications: 'अद्याप सूचना नाहीत.',
  },
  ta: {
    appName: 'லோக்கல்பல்ஸ்',
    feed: 'ஃபீட்',
    report: 'புகார் செய்யவும்',
    events: 'நிகழ்வுகள்',
    directory: 'அடைவு',
    profile: 'சுயவிவரம்',
    communityFeed: 'சமூக ஃபீட்',
    reportIssue: 'சிக்கலைப் புகாரளிக்கவும்',
    category: 'வகை',
    description: 'விளக்கம்',
    submit: 'புகாரை சமர்ப்பிக்கவும்',
    search: 'தேடு',
    useMyLocation: 'எனது இடத்தைப் பயன்படுத்து',
    sortBy: 'வரிசைப்படுத்து',
    mostRecent: 'புதியவை',
    mostUpvoted: 'அதிக வோட்டு',
    radius: 'சுற்றளவு',
    noIssues: 'இந்தப் பகுதியில் இன்னும் சிக்கல்கள் இல்லை.',
    comments: 'கருத்துகள்',
    postComment: 'பதிவிடு',
    addComment: 'கருத்து சேர்க்கவும்...',
    noComments: 'இன்னும் கருத்துகள் இல்லை.',
    open: 'திறந்துள்ளது',
    underReview: 'மறுஆய்வில்',
    inProgress: 'நடைபெறுகிறது',
    resolved: 'தீர்க்கப்பட்டது',
    authorityLogin: 'அதிகாரி உள்நுழைவு',
    logOut: 'வெளியேறு',
    localEvents: 'உள்ளூர் நிகழ்வுகள் & அறிவிப்புகள்',
    postEvent: 'நிகழ்வை பதிவிடு',
    serviceProviders: 'உள்ளூர் சேவை வழங்குநர்கள்',
    addListing: 'பட்டியல் சேர்க்கவும்',
    notifications: 'அறிவிப்புகள்',
    noNotifications: 'இன்னும் அறிவிப்புகள் இல்லை.',
  },
}

// All 22 official Indian languages — only en/hi/mr/ta are fully translated above.
// Others fall back to English until translated, but appear in the picker now.
export const availableLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'bn', label: 'বাংলা (Bengali) — coming soon' },
  { code: 'te', label: 'తెలుగు (Telugu) — coming soon' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati) — coming soon' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada) — coming soon' },
  { code: 'ml', label: 'മലയാളം (Malayalam) — coming soon' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi) — coming soon' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia) — coming soon' },
  { code: 'as', label: 'অসমীয়া (Assamese) — coming soon' },
  { code: 'ur', label: 'اردو (Urdu) — coming soon' },
  { code: 'ks', label: 'कॉशुर (Kashmiri) — coming soon' },
  { code: 'sd', label: 'سنڌي (Sindhi) — coming soon' },
  { code: 'ne', label: 'नेपाली (Nepali) — coming soon' },
  { code: 'kok', label: 'कोंकणी (Konkani) — coming soon' },
  { code: 'mni', label: 'মৈতৈলোন্ (Manipuri) — coming soon' },
  { code: 'bo', label: 'བོད་སྐད (Bodo) — coming soon' },
  { code: 'doi', label: 'डोगरी (Dogri) — coming soon' },
  { code: 'mai', label: 'मैथिली (Maithili) — coming soon' },
  { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali) — coming soon' },
  { code: 'sa', label: 'संस्कृत (Sanskrit) — coming soon' },
]

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('localpulse_lang') || 'en')

  const supportedLanguages = ['en', 'hi', 'mr', 'ta']

function changeLanguage(code) {
  if (!supportedLanguages.includes(code)) {
    alert('This language is coming soon! Showing English for now.')
    setLang('en')
    localStorage.setItem('localpulse_lang', 'en')
    return
  }
  setLang(code)
  localStorage.setItem('localpulse_lang', code)
}

  function t(key) {
    return translations[lang]?.[key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}