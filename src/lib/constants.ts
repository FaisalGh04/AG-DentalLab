// The "Received By" roster used to live here as RECEIVED_BY_OPTIONS. It is now
// sourced from the StaffMember table (src/lib/staff.ts) so the confirmation
// gate and the dropdown can never drift apart. Names are data, not UI chrome —
// they are still never translated.

export const SITE = {
  name: "AG Dental Lab",
  tagline: "Your Partner in Perfect Smiles",
  descriptor: "Dental Laboratory • Established 1994",
  founder: "Abdullatif Ghatasheh",
  phone: "+962 77 749 3919",
  phoneHref: "tel:+962777493919",
  location: "Al-Rabiah, Amman, Jordan",
  instagram: "ag.dentallab",
  instagramHref: "https://instagram.com/ag.dentallab",
  description:
    "AG Dental Lab — a dental laboratory combining traditional craftsmanship with digital technology, delivering precise, reliable zirconia, CAD/CAM restorations, implant solutions and 3D printing since 1994.",
} as const;
