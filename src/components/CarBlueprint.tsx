export function CarBlueprint() {
  return (
    <svg className="car-blueprint" viewBox="0 0 410 240" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="car-fill"
          x1="200"
          y1="30"
          x2="200"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#909090" stopOpacity=".24" />
          <stop offset="1" stopColor="#333333" stopOpacity=".05" />
        </linearGradient>
      </defs>
      <ellipse cx="220" cy="198" rx="160" ry="12" fill="#000" opacity=".15" />
      <g stroke="#cccccc" strokeWidth="1.1" strokeLinejoin="round">
        <path
          d="m53 142 26-48 57-28 130-2 54 28 53 17 15 37-16 26-58 8H99l-39-15z"
          fill="url(#car-fill)"
        />
        <path d="m81 97 63-23 112-2 46 25-103 7z" fill="#1b1b1b" />
        <path d="m101 103 95 10 117-11 40 15-112 14-166-9z" />
        <path
          d="m69 126-6 26 36 11h233l38-13-12-26M196 113v58M307 108l14 25-1 36M101 105l-8 26 11 38"
          opacity=".7"
        />
        <path d="m141 77-18 26m55-29 15 29m52-30 34 27" />
        <path d="m67 134 34 7-4 12-34-6m270-14 38-8 5 14-38 9" fill="#a8a8a8" fillOpacity=".22" />
        <path d="m141 131 22 1m88-2 23-2m-143 22h170m-193-6 23 4" opacity=".45" />
        <ellipse cx="118" cy="169" rx="23" ry="29" fill="#202020" />
        <ellipse cx="118" cy="169" rx="13" ry="19" />
        <ellipse cx="118" cy="169" rx="5" ry="8" />
        <ellipse cx="328" cy="165" rx="23" ry="29" fill="#202020" />
        <ellipse cx="328" cy="165" rx="13" ry="19" />
        <ellipse cx="328" cy="165" rx="5" ry="8" />
      </g>
      <g stroke="#c9c9c9" strokeWidth="1" opacity=".36">
        <path d="M42 72V53h25m284 0h25v20M42 182v22h25m284 0h25v-22" />
        <path strokeDasharray="3 6" d="M42 216h334M32 72v104" />
      </g>
      <g fill="#f1f1f1">
        <circle cx="93" cy="113" r="3" />
        <circle cx="270" cy="85" r="3" />
        <circle cx="350" cy="146" r="3" />
      </g>
      <g stroke="#f1f1f1" opacity=".22">
        <circle cx="93" cy="113" r="9" />
        <circle cx="270" cy="85" r="9" />
        <circle cx="350" cy="146" r="9" />
      </g>
    </svg>
  );
}
