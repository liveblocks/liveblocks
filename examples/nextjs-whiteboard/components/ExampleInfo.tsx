import React, { useState } from "react";
import Link from "next/link";

const WEBSITE_ROUTES = {
  HOME: "https://liveblocks.io/",
  EXAMPLES: "/",
};

type Props = {
  title: string;
  description: string;
  githubHref?: string;
  codeSandboxHref?: string;
};

export default function ExampleInfo({
  title,
  description,
  githubHref,
  codeSandboxHref,
}: Props) {
  const [isShowing, setIsShowing] = useState(true);

  if (!isShowing) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-4 py-6 px-8 w-96 rounded-lg"
      style={{ background: "#14161b" }}
    >
      <div className="flex justify-between">
        <div>
          <Link href={WEBSITE_ROUTES.EXAMPLES}>
            <a href={WEBSITE_ROUTES.EXAMPLES} className="text-xs font-medium">
              Examples
            </a>
          </Link>
          <h1 className="font-medium text-lg text-gray-200">{title}</h1>
        </div>

        <button
          className="text-gray-400 hover:text-gray-300 focus:text-gray-300 w-8 h-8 flex items-center justify-center -mr-3 rounded-full"
          onClick={(e) => {
            setIsShowing(false);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2.96967 11.9697L11.9697 2.96967L13.0303 4.03033L4.03033 13.0303L2.96967 11.9697Z"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M13.0303 11.9697L4.03033 2.96967L2.96968 4.03033L11.9697 13.0303L13.0303 11.9697Z"
            />
          </svg>
        </button>
      </div>
      <p className="mt-4 leading-relaxed text-gray-400">{description}</p>
      <div className="flex items-center justify-between mt-6">
        <a
          href={WEBSITE_ROUTES.HOME}
          title="Go to Liveblocks homepage"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            width="133"
            height="28"
            viewBox="0 0 133 28"
            color="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14 9H0.0999756L4.09998 13.2V19L14 9ZM5.99998 21H19.9L15.9 16.8V11L5.99998 21Z"
              fill="url(#paint0_radial)"
            />
            <path
              d="M25.1368 4.76H28.408V21H25.1368V4.76ZM32.3348 4.1104C32.8761 4.1104 33.3246 4.28827 33.6804 4.644C34.0361 4.98427 34.214 5.41733 34.214 5.9432C34.214 6.46907 34.0361 6.90987 33.6804 7.2656C33.3246 7.62133 32.8761 7.7992 32.3348 7.7992C31.7934 7.7992 31.3372 7.62133 30.966 7.2656C30.6102 6.90987 30.4324 6.46907 30.4324 5.9432C30.4324 5.41733 30.6102 4.98427 30.966 4.644C31.3372 4.28827 31.7934 4.1104 32.3348 4.1104ZM30.6876 9.0752H33.9588V21H30.6876V9.0752ZM35.0784 9.0752H38.5816L41.4584 17.6592L44.2888 9.0752H47.7224L43.4304 21H39.3704L35.0784 9.0752ZM47.8955 15.0608C47.8955 13.8235 48.1429 12.7485 48.6379 11.836C49.1483 10.908 49.852 10.1965 50.7491 9.7016C51.6616 9.1912 52.7133 8.936 53.9043 8.936C55.1107 8.936 56.1701 9.17573 57.0827 9.6552C58.0107 10.1192 58.7299 10.7843 59.2403 11.6504C59.7661 12.5011 60.0368 13.5064 60.0523 14.6664C60.0523 15.084 60.0213 15.4552 59.9595 15.78H51.3059V15.8728C51.3832 16.7389 51.6616 17.4195 52.1411 17.9144C52.6205 18.4093 53.2779 18.6568 54.1131 18.6568C54.7781 18.6568 55.3272 18.5176 55.7603 18.2392C56.2088 17.9453 56.5027 17.52 56.6419 16.9632H59.8667C59.7429 17.752 59.4413 18.4635 58.9619 19.0976C58.4824 19.7317 57.8483 20.2344 57.0595 20.6056C56.2707 20.9613 55.3659 21.1392 54.3451 21.1392C53.0149 21.1392 51.8627 20.8917 50.8883 20.3968C49.9293 19.9019 49.1869 19.1981 48.6611 18.2856C48.1507 17.3576 47.8955 16.2827 47.8955 15.0608ZM56.7811 13.6456C56.6728 12.9187 56.3712 12.3619 55.8763 11.9752C55.3968 11.5731 54.7859 11.372 54.0435 11.372C53.332 11.372 52.7288 11.5808 52.2339 11.9984C51.7544 12.4005 51.4683 12.9496 51.3755 13.6456H56.7811ZM68.7071 8.936C69.7743 8.936 70.7255 9.18347 71.5607 9.6784C72.3959 10.1579 73.0455 10.8616 73.5095 11.7896C73.989 12.7021 74.2287 13.7771 74.2287 15.0144C74.2287 16.2208 73.989 17.288 73.5095 18.216C73.0455 19.144 72.3959 19.8632 71.5607 20.3736C70.7255 20.884 69.7821 21.1392 68.7303 21.1392C67.8951 21.1392 67.1682 20.9845 66.5495 20.6752C65.9309 20.3504 65.4205 19.9173 65.0183 19.376L64.6935 21H61.8399V4.76H65.1111V10.5832C66.0237 9.48507 67.2223 8.936 68.7071 8.936ZM67.9647 18.4712C68.8463 18.4712 69.5578 18.1541 70.0991 17.52C70.6405 16.8859 70.9111 16.0584 70.9111 15.0376C70.9111 14.0168 70.6405 13.1893 70.0991 12.5552C69.5578 11.9211 68.8463 11.604 67.9647 11.604C67.0831 11.604 66.3794 11.9211 65.8535 12.5552C65.3277 13.1739 65.0647 13.9936 65.0647 15.0144C65.0647 16.0507 65.3277 16.8859 65.8535 17.52C66.3794 18.1541 67.0831 18.4712 67.9647 18.4712ZM76.0454 4.76H79.3166V21H76.0454V4.76ZM87.4194 21.1392C86.1666 21.1392 85.0607 20.8917 84.1018 20.3968C83.1583 19.8864 82.4236 19.1672 81.8978 18.2392C81.3874 17.3112 81.1322 16.244 81.1322 15.0376C81.1322 13.8312 81.3874 12.764 81.8978 11.836C82.4236 10.908 83.1583 10.1965 84.1018 9.7016C85.0607 9.1912 86.1666 8.936 87.4194 8.936C88.6722 8.936 89.7703 9.1912 90.7138 9.7016C91.6727 10.1965 92.4074 10.908 92.9178 11.836C93.4436 12.764 93.7066 13.8312 93.7066 15.0376C93.7066 16.2595 93.4436 17.3344 92.9178 18.2624C92.4074 19.1749 91.6727 19.8864 90.7138 20.3968C89.7703 20.8917 88.6722 21.1392 87.4194 21.1392ZM87.4194 18.4712C88.3319 18.4712 89.0511 18.1541 89.577 17.52C90.1183 16.8859 90.389 16.0584 90.389 15.0376C90.389 14.0168 90.1183 13.1893 89.577 12.5552C89.0511 11.9211 88.3319 11.604 87.4194 11.604C86.5223 11.604 85.8031 11.9211 85.2618 12.5552C84.7359 13.1893 84.473 14.0168 84.473 15.0376C84.473 16.0584 84.7359 16.8859 85.2618 17.52C85.8031 18.1541 86.5223 18.4712 87.4194 18.4712ZM106.968 16.476C106.751 17.9299 106.133 19.0744 105.112 19.9096C104.107 20.7293 102.8 21.1392 101.191 21.1392C99.9538 21.1392 98.8711 20.8917 97.9431 20.3968C97.0151 19.8864 96.2959 19.1672 95.7855 18.2392C95.2906 17.3112 95.0431 16.244 95.0431 15.0376C95.0431 13.8157 95.2906 12.7485 95.7855 11.836C96.2959 10.908 97.0151 10.1965 97.9431 9.7016C98.8866 9.1912 99.977 8.936 101.214 8.936C102.807 8.936 104.107 9.34587 105.112 10.1656C106.117 10.9699 106.736 12.0912 106.968 13.5296H103.581C103.442 12.9419 103.163 12.4779 102.746 12.1376C102.328 11.7819 101.81 11.604 101.191 11.604C100.34 11.604 99.6599 11.9211 99.1495 12.5552C98.6391 13.1893 98.3839 14.0168 98.3839 15.0376C98.3839 16.0584 98.6391 16.8859 99.1495 17.52C99.6599 18.1541 100.34 18.4712 101.191 18.4712C101.825 18.4712 102.351 18.2933 102.769 17.9376C103.202 17.5819 103.48 17.0947 103.604 16.476H106.968ZM108.738 4.76H112.01V14.156L116.696 9.0752H120.362L116.116 13.7384L120.594 21H116.812L113.796 16.1744L112.01 18.1V21H108.738V4.76ZM123.845 17.0328C123.891 17.5587 124.146 17.984 124.61 18.3088C125.074 18.6336 125.67 18.796 126.397 18.796C127.093 18.796 127.642 18.6877 128.044 18.4712C128.446 18.2392 128.647 17.9144 128.647 17.4968C128.647 17.1875 128.554 16.9555 128.369 16.8008C128.183 16.6461 127.92 16.5379 127.58 16.476C127.24 16.3987 126.683 16.3136 125.909 16.2208C124.858 16.0816 123.984 15.9037 123.288 15.6872C122.592 15.4707 122.035 15.1304 121.617 14.6664C121.2 14.2024 120.991 13.5837 120.991 12.8104C120.991 12.0371 121.2 11.3565 121.617 10.7688C122.051 10.1656 122.654 9.7016 123.427 9.3768C124.2 9.052 125.09 8.8896 126.095 8.8896C127.719 8.90507 129.026 9.25307 130.016 9.9336C131.021 10.6141 131.563 11.5576 131.64 12.764H128.531C128.485 12.3155 128.245 11.952 127.812 11.6736C127.394 11.3797 126.853 11.2328 126.188 11.2328C125.569 11.2328 125.067 11.3488 124.68 11.5808C124.309 11.8128 124.123 12.1221 124.123 12.5088C124.123 12.7872 124.224 12.996 124.425 13.1352C124.626 13.2744 124.889 13.3749 125.213 13.4368C125.538 13.4987 126.08 13.5683 126.837 13.6456C128.446 13.8312 129.676 14.1792 130.526 14.6896C131.392 15.1845 131.825 16.0429 131.825 17.2648C131.825 18.0381 131.593 18.7187 131.129 19.3064C130.681 19.8941 130.047 20.3504 129.227 20.6752C128.423 20.9845 127.487 21.1392 126.42 21.1392C124.765 21.1392 123.419 20.7757 122.383 20.0488C121.347 19.3064 120.798 18.3011 120.736 17.0328H123.845Z"
              fill="currentColor"
            />
            <defs>
              <radialGradient
                id="paint0_radial"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(-2.79759 6) rotate(31.5477) scale(24.8467 19.2913)"
              >
                <stop stopColor="#FF0099" />
                <stop offset="1" stopColor="#FF7A00" />
              </radialGradient>
            </defs>
          </svg>
        </a>
        <ul className="flex items-center -mr-2">
          <li>
            <a
              className="flex items-center justify-center p-2 text-gray-400 rounded-full"
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Github"
              aria-label="Open in Github"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 1.66664C8.90569 1.66664 7.82206 1.88219 6.81101 2.30098C5.79997 2.71977 4.88131 3.3336 4.10749 4.10742C2.54468 5.67022 1.66671 7.78984 1.66671 9.99998C1.66671 13.6833 4.05838 16.8083 7.36671 17.9166C7.78338 17.9833 7.91671 17.725 7.91671 17.5V16.0916C5.60838 16.5916 5.11671 14.975 5.11671 14.975C4.73338 14.0083 4.19171 13.75 4.19171 13.75C3.43338 13.2333 4.25004 13.25 4.25004 13.25C5.08338 13.3083 5.52504 14.1083 5.52504 14.1083C6.25004 15.375 7.47504 15 7.95004 14.8C8.02504 14.2583 8.24171 13.8916 8.47504 13.6833C6.62504 13.475 4.68338 12.7583 4.68338 9.58331C4.68338 8.65831 5.00004 7.91664 5.54171 7.32498C5.45838 7.11664 5.16671 6.24998 5.62504 5.12498C5.62504 5.12498 6.32504 4.89998 7.91671 5.97498C8.57504 5.79164 9.29171 5.69998 10 5.69998C10.7084 5.69998 11.425 5.79164 12.0834 5.97498C13.675 4.89998 14.375 5.12498 14.375 5.12498C14.8334 6.24998 14.5417 7.11664 14.4584 7.32498C15 7.91664 15.3167 8.65831 15.3167 9.58331C15.3167 12.7666 13.3667 13.4666 11.5084 13.675C11.8084 13.9333 12.0834 14.4416 12.0834 15.2166V17.5C12.0834 17.725 12.2167 17.9916 12.6417 17.9166C15.95 16.8 18.3334 13.6833 18.3334 9.99998C18.3334 8.90563 18.1178 7.82199 17.699 6.81095C17.2803 5.7999 16.6664 4.88124 15.8926 4.10742C15.1188 3.3336 14.2001 2.71977 13.1891 2.30098C12.178 1.88219 11.0944 1.66664 10 1.66664V1.66664Z" />
              </svg>
            </a>
          </li>
          <li>
            <a
              className="flex items-center justify-center p-2 text-gray-400 rounded-full"
              href={codeSandboxHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in CodeSandbox"
              aria-label="Open in CodeSandbox"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 4L7.969 0L14.9405 4L15.0005 11.966L7.969 16L1 12V4ZM2.393 5.6535V8.8255L4.622 10.065V12.409L7.2705 13.9405V8.425L2.393 5.6535ZM13.552 5.6535L8.6745 8.4245V13.94L11.3205 12.4085V10.0675L13.5525 8.8255L13.552 5.6535ZM3.0885 4.401L7.9585 7.164L12.8385 4.3775L10.258 2.9115L7.9845 4.2085L5.698 2.896L3.0885 4.401Z" />
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}