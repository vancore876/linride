/**
 * Decorative, self-contained Jamaican countryside scene. No network imagery,
 * no layout shift, and no invented GPS / ETA data.
 */
export function CountryRoadScene({ className = "" }: { className?: string }) {
  return (
    <div className={`auth4-country-scene ${className}`} aria-hidden="true">
      <svg className="auth4-scene-svg" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id="lr4-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b7dae1" />
            <stop offset="60%" stopColor="#e7efd0" />
            <stop offset="100%" stopColor="#f9edc3" />
          </linearGradient>
          <linearGradient id="lr4-backhill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#84a897" />
            <stop offset="100%" stopColor="#719c7d" />
          </linearGradient>
          <linearGradient id="lr4-foreground" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2c7859" />
            <stop offset="100%" stopColor="#225b41" />
          </linearGradient>
          <linearGradient id="lr4-road" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b6666" />
            <stop offset="100%" stopColor="#253237" />
          </linearGradient>
          <linearGradient id="lr4-car" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#eff8ed" />
            <stop offset="58%" stopColor="#b9d7cb" />
            <stop offset="100%" stopColor="#8baea0" />
          </linearGradient>
          <linearGradient id="lr4-glass" x1="0" x2="1">
            <stop offset="0%" stopColor="#274b55" />
            <stop offset="100%" stopColor="#5c8c92" />
          </linearGradient>
          <filter id="lr4-soft"><feGaussianBlur stdDeviation="7" /></filter>
          <filter id="lr4-shadow"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>

        <rect width="1200" height="520" fill="url(#lr4-sky)" />
        <circle cx="967" cy="111" r="64" fill="#ffecc2" opacity=".55" filter="url(#lr4-soft)" />
        <circle className="auth4-sun" cx="967" cy="111" r="36" fill="#fff4d9" opacity=".95" />
        <g className="auth4-cloud-one" fill="#fffef2" opacity=".64">
          <ellipse cx="150" cy="102" rx="62" ry="16" />
          <ellipse cx="120" cy="96" rx="28" ry="24" />
          <ellipse cx="173" cy="96" rx="31" ry="22" />
        </g>
        <g className="auth4-cloud-two" fill="#fffdf3" opacity=".45">
          <ellipse cx="714" cy="71" rx="78" ry="16" />
          <ellipse cx="681" cy="62" rx="37" ry="19" />
          <ellipse cx="739" cy="66" rx="37" ry="19" />
        </g>

        <path d="M0 271Q89 200 170 226T365 189T600 232T860 179T1200 241V409H0Z" fill="#a9c9a5" />
        <path d="M0 315Q143 231 257 282T502 250T771 300T1055 232T1200 278V407H0Z" fill="url(#lr4-backhill)" />
        <path d="M0 341Q141 293 240 319T438 315T703 340T916 299T1200 330V430H0Z" fill="#4b986b" />
        <path d="M0 354Q130 319 244 352T515 339T849 358T1200 332V422H0Z" fill="url(#lr4-foreground)" />

        <g className="auth4-village">
          <rect x="255" y="309" width="75" height="56" rx="2" fill="#e9dabb" />
          <path d="M244 313L293 280L344 313Z" fill="#bd7050" />
          <rect x="267" y="328" width="19" height="21" fill="#527f7c" />
          <rect x="299" y="329" width="20" height="36" fill="#806d53" />
          <rect x="834" y="311" width="83" height="57" rx="2" fill="#ded4bb" />
          <path d="M825 318L869 288L930 318Z" fill="#a36543" />
          <rect x="842" y="331" width="22" height="20" fill="#4b8786" />
          <rect x="876" y="335" width="23" height="33" fill="#967754" />
          <path d="M838 311H917" stroke="#f3e6d0" strokeWidth="3" />
        </g>

        <g className="auth4-palm auth4-palm-left" transform="translate(118 282)">
          <path d="M19 126Q30 72 16 7" fill="none" stroke="#80694b" strokeWidth="12" strokeLinecap="round" />
          <path d="M16 10Q-34 -22 -88 7Q-31 0 15 20M16 9Q-20 -43 -66 -53Q-8 -32 22 20M18 9Q56 -33 106 -16Q58 -5 22 21M18 10Q74 22 104 52Q50 31 20 21M18 11Q1 -35 10 -63Q26 -23 24 21" fill="#266a4c" stroke="#2b7353" strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="auth4-palm auth4-palm-right" transform="translate(1065 294)">
          <path d="M10 113Q20 45 10 -8" fill="none" stroke="#7e6443" strokeWidth="10" strokeLinecap="round" />
          <path d="M10 -8Q-38 -41 -89 -10Q-27 -16 12 3M11 -8Q-6 -51 -43 -69Q3 -42 15 4M10 -8Q63 -40 94 -24Q49 -15 15 5M10 -9Q62 1 96 38Q49 18 13 5M10 -8Q3 -57 27 -78Q26 -32 17 5" fill="#255e47" stroke="#2a7652" strokeWidth="5" />
        </g>

        <path d="M0 390Q480 378 1200 391V442H0Z" fill="#5c8c62" />
        <path d="M0 418L1200 408V520H0Z" fill="url(#lr4-road)" />
        <path d="M0 419L1200 409" stroke="#a8ae9c" strokeWidth="6" />
        <path d="M0 514L1200 500" stroke="#cbd1bb" strokeWidth="4" opacity=".5" />
        <path d="M-140 464L1350 453" stroke="#ecdfb7" strokeWidth="5" strokeDasharray="65 64" className="auth4-road-dashes" />
        <path d="M0 401L1200 391" stroke="#365739" strokeWidth="8" />
        <g className="auth4-grass-foreground" fill="none" strokeLinecap="round">
          <path d="M0 416L8 397L10 420M35 416L26 394L48 402M183 417L192 393L202 416M1001 406L1010 383L1022 403M1114 405L1117 388L1133 404" stroke="#3f8050" strokeWidth="4" />
        </g>

        <g className="auth4-vehicle">
          <ellipse cx="136" cy="124" rx="130" ry="12" fill="#152c2c" opacity=".36" filter="url(#lr4-shadow)" />
          <rect x="0" y="56" width="274" height="62" rx="16" fill="url(#lr4-car)" stroke="#597e76" strokeWidth="2" />
          <path d="M45 57L81 13Q85 8 95 8H185Q195 8 202 18L233 57Z" fill="url(#lr4-car)" stroke="#55786f" strokeWidth="3" />
          <path d="M84 52L103 19H144V52Z" fill="url(#lr4-glass)" />
          <path d="M150 19H185Q191 19 196 26L216 52H150Z" fill="url(#lr4-glass)" />
          <path d="M90 49L131 21" stroke="#d3ece4" strokeWidth="2" opacity=".38" />
          <path d="M148 19V100M47 71V103M235 69V101" stroke="#64877c" strokeWidth="2" opacity=".8" />
          <rect x="166" y="73" width="20" height="4" rx="2" fill="#567b72" />
          <rect x="20" y="66" width="27" height="9" rx="3" fill="#f9f0c9" />
          <rect x="253" y="68" width="13" height="10" rx="2" fill="#c75e40" />
          <path d="M4 105H270" stroke="#718c7b" strokeWidth="5" />
          <g className="auth4-wheel" transform="translate(66 118)">
            <circle r="27" fill="#263337" stroke="#151c1c" strokeWidth="5" />
            <circle r="16" fill="#b8c5bd" stroke="#65716b" strokeWidth="3" />
            <path d="M-12 0H12M0 -12V12M-9 -9L9 9M9 -9L-9 9" stroke="#526561" strokeWidth="3" />
          </g>
          <g className="auth4-wheel" transform="translate(212 118)">
            <circle r="27" fill="#263337" stroke="#151c1c" strokeWidth="5" />
            <circle r="16" fill="#b8c5bd" stroke="#65716b" strokeWidth="3" />
            <path d="M-12 0H12M0 -12V12M-9 -9L9 9M9 -9L-9 9" stroke="#526561" strokeWidth="3" />
          </g>
        </g>
        <rect y="510" width="1200" height="10" fill="#243d2d" opacity=".65" />
      </svg>
    </div>
  );
}
