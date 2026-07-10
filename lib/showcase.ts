// Manifests for the presentation views (/stores, /brands, /company).
// Store photos live in public/store/<Store Name>/ — folder + file names contain
// spaces and Vietnamese diacritics, so every path goes through encodeURI once here.

export interface StoreEntry {
  name: string;
  /** First image is the hero shot; the rest fill the 2×2 grid (max 4 used). */
  images: string[];
}

function storeImages(folder: string, files: string[]): string[] {
  return files.map((f) => encodeURI(`/store/${folder}/${f}`));
}

export const STORES: StoreEntry[] = [
  {
    name: "Vincom Đồng Khởi",
    images: storeImages("Vincom Đồng Khởi", [
      "z8023534212486_de0bbdd1f558909791d12f7c7e272381.jpg",
      "z8023534212566_3b7139d25d571c909512220c0c91310d.jpg",
      "z8023534212571_2e7f0d98a0de9a31fc6217e5b46a65ed.jpg",
      "z8023534212575_990a059cb415ce35fefdbfefcf7bc6a4.jpg",
      "z8023534212580_a3740dd3ae7ae0831e85df51c980c8b4.jpg",
    ]),
  },
  {
    name: "Vincom Vinh",
    images: storeImages("Vincom Vinh", [
      "z8023527749904_62a6be64f5b316f4ead2dcce8913078e.jpg",
      "z8023527750046_57024a9f8aeab8a13028f5563549e8ab.jpg",
      "z8023527750047_36009bb767ef6957054d86467a73734a.jpg",
      "z8023527750051_5b27340eea17615f9655fb62b71423b1.jpg",
      "z8023527750052_f93f13548e30290d280660c0d765f2a3.jpg",
    ]),
  },
  {
    name: "Vincom Biên Hòa",
    images: storeImages("Vincom Biên Hòa", [
      "z8023535072949_3f42abe8918b14361438bf66cc752b19.jpg",
      "z8023535073000_aceb99c8e1161c756d591d5bf44a227b.jpg",
      "z8023535073002_ab9a53fbbb52eb8f9b4bf733c8fd1368.jpg",
      "z8023535073003_2184eeefe3175a0e365bbb141fede5c8.jpg",
      "z8023535073005_9d18c12e9dcab246850ee0def3542bd5.jpg",
    ]),
  },
  {
    name: "AEON Mall Tân Phú",
    images: storeImages("AEON Mall Tân Phú", [
      "z8023538836918_3d003ca88539733f5f569a877ddbb1e2.jpg",
      "z8023538856688_1c2919208ffbb3666366cdb06138ff15.jpg",
      "z8023538856711_c6276a9f2eabe66cdc64e2328a1c8c18.jpg",
      "z8023538856713_7410f62618bbe5257efa50b964f068d3.jpg",
      "z8023538856714_dac1c30f13a25a0d65ebb172bffdd27f.jpg",
    ]),
  },
  {
    // Pico 3D renders — the facade leads; floor-plan + plain exam-room renders skipped.
    // crop-* copies have the presentation frame + watermark strip cut off.
    name: "AEON Mall Bình Tân",
    images: storeImages("AEON Mall Bình tân", [
      "crop-z8023906934722_2cc8d4fa445506e2b9899bda98410fd3.jpg",
      "crop-z8023906934716_c3a49d5026120140cfa43c2e5df2a87f.jpg",
      "crop-z8023906940889_bddffd90d67fced0f90b76c69479d1e6.jpg",
      "z8023906945045_a319f6a110fa29e44a071b3736814161.jpg",
      "z8023906943445_4395e0952105a66758cffefedcd4d483.jpg",
    ]),
  },
  {
    // These are 3D renders — the facade render leads; the floor-plan render is skipped.
    name: "AEON Mall Bình Dương",
    images: storeImages("AEON Mall Bình Dương", [
      "z8023625383180_c325295a5d4373d0d7158b877a4cf867.jpg",
      "z8023625383177_bd831167269a5af38a0bf0281cd9ea9a.jpg",
      "z8023625383178_d6f1409db5f9e0e63402c0ba1523de3b.jpg",
      "z8023625383181_0fa22b913c739c5e23cc7d87f0535d59.jpg",
      "z8023625383182_20b65f19846eb593a8a9143dd735b1c3.jpg",
    ]),
  },
];

export interface CompanySlide {
  /** Small script line above the headline. */
  eyebrow: string;
  title: string;
  /** First image is the hero shot; the rest fill a 2-column grid. */
  images: string[];
}

// "Sinh nhật 37 năm" slides. Sources are the operator's full-resolution
// photos in public/company (untracked, 6–21 MB each — never load those on
// the kiosk); the kiosk serves the ≤2000px copies in public/company-show,
// regenerated with `node scripts/resize-company.mjs` whenever photos change.
export const COMPANY_SLIDES: CompanySlide[] = [
  {
    eyebrow: "Vinh danh cống hiến",
    title: "5 – 10 năm",
    images: ["/company-show/tenure-5-10.jpg"],
  },
  {
    eyebrow: "Vinh danh cống hiến",
    title: "15 năm",
    images: ["/company-show/tenure-15.jpg"],
  },
  {
    eyebrow: "Vinh danh cống hiến",
    title: "Trên 15 năm",
    images: ["/company-show/tenure-over-15.jpg"],
  },
  {
    eyebrow: "Mắt Việt",
    title: "Đại gia đình Mắt Việt",
    images: [
      "/company-show/party-1.jpg",
      "/company-show/party-2.jpg",
      "/company-show/party-3.jpg",
      "/company-show/party-4.jpg",
      "/company-show/party-5.jpg",
    ],
  },
  {
    eyebrow: "Mắt Việt",
    title: "Nhịp sống Mắt Việt",
    images: [
      "/company-show/daily-1.jpg",
      "/company-show/daily-2.jpg",
      "/company-show/daily-3.jpg",
      "/company-show/daily-4.jpg",
      "/company-show/daily-5.jpg",
    ],
  },
  {
    eyebrow: "Mắt Việt",
    title: "Vinh danh Best Award",
    images: [
      "/company-show/best-1.jpg",
      "/company-show/best-2.jpg",
      "/company-show/best-3.jpg",
    ],
  },
  {
    eyebrow: "Mắt Việt",
    title: "Training nâng cao kỹ năng",
    images: [
      "/company-show/training-1.jpg",
      "/company-show/training-2.jpg",
      "/company-show/training-3.jpg",
      "/company-show/training-4.jpg",
    ],
  },
  {
    eyebrow: "Quỹ thiện nguyện",
    title: "“Gửi niềm tin – Trao ánh sáng”",
    images: [
      "/company-show/charity-1.jpg",
      "/company-show/charity-2.jpg",
      "/company-show/charity-3.jpg",
      "/company-show/charity-4.jpg",
    ],
  },
];

export interface BrandEntry {
  key: string;
  label: string;
  /** White logo PNG (resized into public/brand-showcase). null → typographic wordmark. */
  src: string | null;
}

// White variants resized from public/brand originals (see brand-showcase folder).
// Lindberg's source ("Lingberg.png") is black-on-transparent → inverted to white.
export const BRANDS: BrandEntry[] = [
  { key: "cartier", label: "Cartier", src: "/brand-showcase/cartier.png" },
  { key: "lindberg", label: "Lindberg", src: "/brand-showcase/lindberg.png" },
  { key: "gucci", label: "Gucci", src: "/brand-showcase/gucci.png" },
  { key: "montblanc", label: "Montblanc", src: "/brand-showcase/montblanc.png" },
  { key: "miumiu", label: "Miu Miu", src: "/brand-showcase/miumiu.png" },
  { key: "prada", label: "Prada", src: "/brand-showcase/prada.png" },
  { key: "swarovski", label: "Swarovski", src: "/brand-showcase/swarovski.png" },
];
