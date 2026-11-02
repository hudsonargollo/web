import{n as e}from"./rolldown-runtime-hePW80VL.js";var t=e({applyComponentStubHeal:()=>u,componentNameFromSource:()=>r,healComponentStubs:()=>l,isComponentNameStub:()=>i,listComponentStubPaths:()=>a}),n=/<(Button|Input|Label|Textarea|Link|img)\b/i;function r(e=``){return String(e||``).match(/\bfunction\s+([A-Z]\w*)\s*\(/)?.[1]||``}function i(e=``){let t=r(e);return!t||!RegExp(`<h[12]\\b[^>]*>\\s*${t}\\s*<\\/h[12]>`).test(e)||/\.map\s*\(/.test(e)||n.test(e)?!1:String(e).length<700}function a(e={}){return Object.entries(e).filter(([e,t])=>/\.jsx$/i.test(e)&&i(t)).map(([e])=>e)}function o(e,t){let n=e.toLowerCase(),r=[];/cta|band|closing/.test(n)&&r.push(`src/components/CtaBand.jsx`,`src/components/ClosingCta.jsx`),/hero/.test(n)&&r.push(`src/components/Hero.jsx`,`src/components/ServicesHero.jsx`,`src/components/BookingHero.jsx`);for(let e of Object.keys(t))/src\/components\/[A-Z]\w+\.jsx$/i.test(e)&&r.push(e);let a=new Set;for(let e of r){if(a.has(e))continue;a.add(e);let n=t[e];if(!(!n||i(n))&&n.length>400)return{path:e,body:n}}return null}function s(e,t,n){let r=t;return n&&(r=r.replace(RegExp(`\\bfunction\\s+${n}\\b`,`g`),`function ${e}`),r=r.replace(RegExp(`export\\s+default\\s+${n}\\b`,`g`),`export default ${e}`),r=r.replace(RegExp(`export\\s+{\\s*${n}\\s*}`,`g`),`export { ${e} }`)),r}function c(e){return`import { Link } from 'react-router-dom'
import Button from './ui/button'
import Reveal from './ui/reveal'

export function ${e}(props) {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32" {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">
            Book your appointment today and experience the difference for yourself.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" variant="primary">
              <Link to="/booking">Book now</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default ${e}
`}function l(e={}){let t={},n=[];for(let[a,l]of Object.entries(e)){if(!/\.jsx$/i.test(a)||!i(l))continue;let u=r(l),d=o(u,e),f=d?r(d.body):``;t[a]=d?s(u,d.body,f):c(u),n.push(a)}return{patch:t,healed:n}}function u(e={}){let{patch:t}=l(e);return Object.keys(t).length?{...e,...t}:e}export{a as i,t as n,l as r,u as t};