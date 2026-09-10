import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[760px] px-6 py-24 text-center lg:py-32">
      <p className="font-mono text-xs tracking-[0.04em] text-ink-700 uppercase">
        404
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-ink md:text-5xl">
        This page does not exist
      </h1>
      <p className="mt-4 text-ink-700">
        The route you followed is not part of Enkrate. Nothing was executed.
      </p>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/">Back to Overview</ButtonLink>
      </div>
    </div>
  );
}
