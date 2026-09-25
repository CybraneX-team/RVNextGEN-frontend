import type { SVGProps } from "react";

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 27.0001C12.1046 27.0001 13 26.1046 13 25.0001V21.0001C13 19.8955 13.8954 19.0001 15 19.0001H17C18.1046 19.0001 19 19.8955 19 21.0001V25.0001C19 26.1046 19.8954 27.0001 21 27.0001H25C26.1046 27.0001 27 26.1046 27 25.0001V15.0001C27.0001 14.8687 26.9743 14.7386 26.9241 14.6172C26.8739 14.4958 26.8003 14.3855 26.7075 14.2926L16.7075 4.29255C16.6146 4.19958 16.5043 4.12582 16.3829 4.07549C16.2615 4.02517 16.1314 3.99927 16 3.99927C15.8686 3.99927 15.7385 4.02517 15.6171 4.07549C15.4957 4.12582 15.3854 4.19958 15.2925 4.29255L5.2925 14.2926C5.19967 14.3855 5.12605 14.4958 5.07586 14.6172C5.02568 14.7386 4.9999 14.8687 5 15.0001V25.0001C5 26.1046 5.89543 27.0001 7 27.0001H11Z" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 24C19.5228 24 24 19.5228 24 14C24 8.47715 19.5228 4 14 4C8.47715 4 4 8.47715 4 14C4 19.5228 8.47715 24 14 24Z" />
      <path d="M21.0713 21.0713L28 28" />
    </svg>
  );
}

export function LibraryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 8H27" />
      <path d="M5 16H13" />
      <path d="M5 24H15" />
      <path d="M24 16.5C24 16.5 24.3161 16.4413 24.8787 15.8787C25.4413 15.3161 26.2044 15 27 15C27.7956 15 28.5587 15.3161 29.1213 15.8787C29.6839 16.4413 30 17.2044 30 18C30 21.0413 26.5315 23.5045 24.8688 24.5105C24.3302 24.8364 23.6698 24.8364 23.1312 24.5105C21.4685 23.5045 18 21.0413 18 18C18 17.2044 18.3161 16.4413 18.8787 15.8787C19.4413 15.3161 20.2044 15 21 15C21.7956 15 22.5587 15.3161 23.1213 15.8787C23.6839 16.4413 24 16.5 24 16.5Z" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14.25 5.30507C16.9167 6.84467 16.9167 10.6937 14.25 12.2333L6 16.9964C3.33333 18.536 9.74445e-07 16.6115 1.10904e-06 13.5323L1.52545e-06 4.00602C1.66004e-06 0.926823 3.33333 -0.997677 6 0.541924L14.25 5.30507Z" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.5" r="0.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5l2.9 6.2 6.6.7-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.7L12 2.5Z" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
