"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const LANDING_SCROLL_CLASS = "landing-scroll";
const REDUCED_MOTION_CLASS = "landing-reduced-motion";

export function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    root.classList.add(LANDING_SCROLL_CLASS);

    if (reduceMotion.matches) {
      root.classList.add(REDUCED_MOTION_CLASS);
      document.querySelector<HTMLVideoElement>(".hero-background-video")?.pause();

      return () => {
        root.classList.remove(LANDING_SCROLL_CLASS, REDUCED_MOTION_CLASS);
      };
    }

    root.classList.remove(REDUCED_MOTION_CLASS);
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      anchors: true,
      autoRaf: false,
      respectReducedMotion: true,
      smoothWheel: true,
      syncTouch: false,
    });
    const media = gsap.matchMedia();
    const cardHandlers: Array<{
      card: HTMLElement;
      enter: () => void;
      leave: () => void;
    }> = [];
    const context = gsap.context(() => {
      media.add("(min-width: 1024px)", () => {
        const sheet = document.querySelector<HTMLElement>(
          "[data-landing-first-sheet]",
        );

        if (!sheet) return undefined;

        gsap.fromTo(
          sheet,
          { yPercent: 8 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: sheet,
              start: "top bottom",
              end: "top top",
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          },
        );

        return undefined;
      });

      const cards = gsap.utils.toArray<HTMLElement>(
        "[data-stock-logo-card]",
      );
      cards.forEach((card, index) => {
        const enter = () => {
          gsap.to(card, {
            y: -8,
            scale: 1.08,
            rotate: index % 2 === 0 ? -2 : 2,
            duration: 0.7,
            ease: "power3.out",
            overwrite: "auto",
          });
        };
        const leave = () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            rotate: 0,
            duration: 0.9,
            ease: "power3.out",
            overwrite: "auto",
          });
        };

        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointerleave", leave);

        cardHandlers.push({ card, enter, leave });
      });

      const revealSections = gsap.utils.toArray<HTMLElement>(
        "[data-reveal-section]",
      );
      revealSections.forEach((section) => {
        gsap.fromTo(
          section,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.5,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
            scrollTrigger: {
              trigger: section,
              start: "top 84%",
              once: true,
            },
          },
        );
      });

      const featuredSection = document.querySelector<HTMLElement>(
        "[data-reveal-feature]",
      );
      if (featuredSection) {
        const introItems = gsap.utils.toArray<HTMLElement>(
          "[data-reveal-intro]",
          featuredSection,
        );
        const guardCard = featuredSection.querySelector<HTMLElement>(
          "[data-reveal-guard-card]",
        );
        const checks = gsap.utils.toArray<HTMLElement>(
          "[data-reveal-check]",
          featuredSection,
        );
        const rejection = featuredSection.querySelector<HTMLElement>(
          "[data-reveal-rejection]",
        );
        const waiting = featuredSection.querySelector<HTMLElement>(
          "[data-reveal-waiting]",
        );

        const featureTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: featuredSection,
            start: "top 78%",
            once: true,
          },
        });

        featureTimeline.fromTo(
          featuredSection,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.05,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
          },
        );

        if (introItems.length > 0) {
          featureTimeline.fromTo(
            introItems,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: "power2.out",
              stagger: 0.1,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.8",
          );
        }

        if (guardCard) {
          featureTimeline.fromTo(
            guardCard,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: "power2.out",
              clearProps: "opacity,visibility,transform",
            },
            "-=0.58",
          );
        }

        if (checks.length > 0) {
          featureTimeline.fromTo(
            checks,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.68,
              ease: "power2.out",
              stagger: 0.16,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.56",
          );
        }

        const finalStates = [rejection, waiting].filter(
          (element): element is HTMLElement => element !== null,
        );
        if (finalStates.length > 0) {
          featureTimeline.fromTo(
            finalStates,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              ease: "power2.out",
              stagger: 0.14,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.44",
          );
        }
      }
    }, root);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    const unsubscribeScroll = lenis.on("scroll", ScrollTrigger.update);
    let layoutSyncFrame = 0;
    const scheduleLayoutSync = () => {
      if (layoutSyncFrame !== 0) return;

      layoutSyncFrame = window.requestAnimationFrame(() => {
        layoutSyncFrame = 0;
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };
    const heightObserver = new ResizeObserver(scheduleLayoutSync);
    const resizeTargets = [
      document.body,
      document.querySelector<HTMLElement>("[data-landing-stack]"),
      document.querySelector<HTMLElement>("footer"),
    ].filter(
      (element): element is HTMLElement => element !== null,
    );
    resizeTargets.forEach((element) => heightObserver.observe(element));

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    window.addEventListener("resize", scheduleLayoutSync);
    window.addEventListener("load", scheduleLayoutSync, { once: true });
    scheduleLayoutSync();

    return () => {
      window.removeEventListener("resize", scheduleLayoutSync);
      window.removeEventListener("load", scheduleLayoutSync);
      heightObserver.disconnect();
      if (layoutSyncFrame !== 0) {
        window.cancelAnimationFrame(layoutSyncFrame);
      }
      cardHandlers.forEach(({ card, enter, leave }) => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointerleave", leave);
      });
      context.revert();
      media.revert();
      unsubscribeScroll();
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      root.classList.remove(LANDING_SCROLL_CLASS, REDUCED_MOTION_CLASS);
    };
  }, []);

  return null;
}
