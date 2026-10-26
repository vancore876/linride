"use client";
import { useEffect, useState } from "react";
import { ArrowRight, CarFront, MapPin } from "lucide-react";
type LoadingScreenProps={onContinue:()=>void};
export function LoadingScreen({onContinue}:LoadingScreenProps){
const [slow,setSlow]=useState(false);
useEffect(()=>{const timeout=window.setTimeout(()=>setSlow(true),3500);return()=>window.clearTimeout(timeout)},[]);
return <main className="auth2-splash" role="status" aria-live="polite" aria-label="Opening LinRide">
<div className="auth2-splash-sun" aria-hidden="true"/>
<div className="auth2-splash-brand"><span><MapPin size={31} strokeWidth={2.8}/></span><strong>lin<span>ride</span>.</strong></div>
<div className="auth2-splash-copy"><span>MADE FOR JAMAICA</span><h1>Good journeys<br/>start close to home.</h1><p>{slow?"Still checking your connection…":"Checking your saved sign-in…"}</p></div>
<div className="auth2-splash-landscape" aria-hidden="true"><svg viewBox="0 0 1000 340" preserveAspectRatio="xMidYMax slice"><path d="M0 185Q110 88 250 156T500 144T750 172T1000 132V340H0Z" fill="#9ed7a2"/><path d="M0 226Q170 153 320 221T680 201T1000 192V340H0Z" fill="#5cad75"/><path d="M0 266Q225 236 445 279T1000 255V340H0Z" fill="#35885e"/><path d="M0 312C320 302 660 326 1000 299" fill="none" stroke="#dceac7" strokeWidth="15"/><path d="M0 312C320 302 660 326 1000 299" fill="none" stroke="#8ba48b" strokeWidth="2" strokeDasharray="18 30"/></svg><div className="auth2-splash-car"><CarFront size={36} strokeWidth={2.2}/></div></div>
<div className="auth2-splash-bottom"><div className="auth2-splash-track"><span/></div>{slow&&<button type="button" onClick={onContinue}>Continue to sign in <ArrowRight size={16}/></button>}</div></main>
}