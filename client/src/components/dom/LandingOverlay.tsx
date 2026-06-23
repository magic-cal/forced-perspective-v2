import styled, { keyframes } from 'styled-components';
import sunriseUrl from '@/assets/equirectangular/spruit_sunrise_2k.hdr.jpg';

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  animation: ${fadeIn} 0.6s ease;
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%),
    url(${sunriseUrl}) center / cover no-repeat;
`;

export function LandingOverlay() {
  return <Overlay />;
}
