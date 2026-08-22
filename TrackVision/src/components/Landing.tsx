import React from 'react';
import { LandingNav } from './landing/LandingNav';
import { HeroSection } from './landing/HeroSection';
import { SocialProofMarquee } from './landing/SocialProofMarquee';
import { FeatureGrid } from './landing/FeatureGrid';
import { ArchitecturePipeline } from './landing/ArchitecturePipeline';
import { OpenVisionPlayground } from './landing/OpenVisionPlayground';
import { PerformanceComparison } from './landing/PerformanceComparison';
import { RoiCalculator } from './landing/RoiCalculator';
import { UseCasesSection } from './landing/UseCasesSection';
import { CodeQuickstart } from './landing/CodeQuickstart';
import { FaqSection } from './landing/FaqSection';
import { CtaBanner } from './landing/CtaBanner';
import { LandingFooter } from './landing/LandingFooter';

export function Landing() {
  return (
    <div className="w-full min-h-screen bg-[#000000] text-[#F5F5F5] font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden">
      {/* Floating Liquid-Glass Navigation */}
      <LandingNav />

      {/* Main Content Stream */}
      <main className="w-full flex flex-col">
        {/* 1. Hero Section with Live 60 FPS Interactive Tracking HUD Simulator */}
        <HeroSection />

        {/* 2. Open Neural & Web Standards Marquee */}
        <SocialProofMarquee />

        {/* 3. Core Capabilities & Value Grid with Cursor Spotlight Lighting */}
        <FeatureGrid />

        {/* 4. Multi-Worker Pipeline & Architecture Visualizer */}
        <ArchitecturePipeline />

        {/* 5. Open-Vocabulary Prompt Conditioning Playground */}
        <OpenVisionPlayground />

        {/* 6. Edge In-Browser Performance & Benchmarks */}
        <PerformanceComparison />

        {/* 7. Interactive Cloud Cost & Bandwidth Savings Calculator */}
        <RoiCalculator />

        {/* 8. Real-World Applications & Use Cases */}
        <UseCasesSection />

        {/* 9. Developer Quickstart & Model Specs */}
        <CodeQuickstart />

        {/* 10. Technical Architecture FAQs */}
        <FaqSection />

        {/* 11. High-Converting Bottom CTA Banner */}
        <CtaBanner />
      </main>

      {/* High-Tech Liquid-Glass Footer */}
      <LandingFooter />
    </div>
  );
}
