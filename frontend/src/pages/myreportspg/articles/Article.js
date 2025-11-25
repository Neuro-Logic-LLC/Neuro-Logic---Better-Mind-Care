/** @format */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleHero from './components/ArticleHero';
import ArticleTOC from './components/ArticleTOC';
import ArticleBody from './components/ArticleBody';
import ArticleCitations from './components/ArticleCitations';
import BackToResources from './components/BackToResources';
import './article.css';

// Article data - in production this would come from an API
const articlesData = {
  'understanding-your-report': {
    title: 'Understanding Your Report',
    slug: 'understanding-your-report',
    updatedAt: '2025-01-01T00:00:00Z',
    author: 'Better Mind Care Clinician',
    sections: [
      {
        heading: 'Overview',
        content: `
          <p>Your Brain Health Report brings your health information together in a way that's clear, supportive, and easy to act on. Instead of overwhelming you with isolated numbers or medical jargon, the report highlights meaningful patterns and explains what they may suggest about your overall cognitive resilience.</p>
          <p>The goal isn't to label or diagnose. The goal is to help you understand your body, your brain, and the factors that support long-term clarity and well-being.</p>
        `
      },
      {
        heading: 'Why This Topic Matters',
        content: `
          <p>Many people notice changes in memory, focus, or energy as life gets busy. These shifts can be influenced by sleep, stress, nutrition, hormones, and metabolic factors. Understanding these elements helps you stay ahead of potential issues without fear or confusion.</p>
          <p>Your report gives you a grounded view of the systems that support brain function — inflammation, nutrient status, metabolic health, and lifestyle patterns — all of which research shows can influence cognitive performance over time.</p>
        `
      },
      {
        heading: 'What the Science Says',
        content: `
          <p>Scientists now understand that cognitive health isn't determined by just one variable. Instead, several interconnected systems work together:</p>

          <h4>Inflammation & Brain Function</h4>
          <p>Chronic inflammation can influence memory, mood, and mental clarity. Research suggests that reducing systemic inflammation supports long-term brain resilience.</p>

          <h4>Nutrient Status</h4>
          <p>Nutrients like B vitamins, omega-3s, and vitamin D play important roles in cognition, energy production, and neurological stability. Many people are low without knowing.</p>

          <h4>Sleep & Stress</h4>
          <p>Poor or inconsistent sleep affects attention, decision-making, and emotional regulation. Stress hormones can shape how your brain processes information and recovers.</p>

          <h4>Metabolic Health</h4>
          <p>Blood sugar stability, cardiovascular function, and lipid markers can all influence brain aging. The brain uses a large amount of energy — and depends heavily on metabolic systems to stay sharp.</p>

          <p>Your report summarizes these findings in a clear, approachable way so you understand which areas may deserve more support.</p>
        `
      },
      {
        heading: 'How This Connects to Your Report',
        content: `
          <p>Your Brain Health Report organizes your information into sections that reflect key contributors to cognitive wellness:</p>
          <ul>
            <li><strong>Strengths</strong> — areas where your biology is currently well-supported</li>
            <li><strong>Attention Areas</strong> — factors that may influence clarity or long-term resilience</li>
            <li><strong>Lifestyle Insights</strong> — daily habits that shape mental performance</li>
            <li><strong>Science-informed recommendations</strong> — simple guidance aligned with your patterns</li>
          </ul>
          <p>You'll also find explanations, definitions, and clinician notes throughout the report to help guide your understanding. Every section is written to reassure, clarify, and empower — not alarm.</p>
        `
      },
      {
        heading: 'Practical Takeaways',
        content: `
          <p>You don't need to overhaul your life to support your brain. Most people benefit from small, steady changes:</p>
          <ul>
            <li>Keep sleep consistent when possible</li>
            <li>Choose nutrient-dense foods that support inflammation balance</li>
            <li>Move regularly — even walking helps</li>
            <li>Maintain routines that lower stress</li>
            <li>Be gentle with yourself during busy or stressful seasons</li>
          </ul>
          <p>Your report will highlight which habits may be most meaningful for you based on the patterns in your information.</p>
        `
      }
    ],
    citations: [
      {
        label:
          'National Institute on Aging — Lifestyle factors and cognitive aging',
        url: 'https://www.nia.nih.gov/'
      },
      {
        label:
          'Harvard Medical School — Inflammation, sleep, and brain function',
        url: 'https://www.health.harvard.edu/'
      },
      {
        label: 'Mayo Clinic — Brain-body connection and metabolic health',
        url: 'https://www.mayoclinic.org/'
      },
      {
        label: 'Cleveland Clinic — Nutrient status and cognitive support',
        url: 'https://health.clevelandclinic.org/'
      },
      {
        label:
          "Alzheimer's Association and NIH — Peer-reviewed research summaries",
        url: 'https://www.alz.org/'
      }
    ]
  },
  'early-cognitive-changes': {
    title: 'Early Cognitive Changes',
    slug: 'early-cognitive-changes',
    updatedAt: '2025-01-15T00:00:00Z',
    author: 'Better Mind Care Clinician',
    sections: [
      {
        heading: 'Overview',
        content:
          '<p>This article covers early signs of cognitive changes and what they might mean for brain health.</p>'
      },
      {
        heading: 'Why This Topic Matters',
        content:
          '<p>Early detection of cognitive changes can lead to timely interventions.</p>'
      },
      {
        heading: 'What the Science Says',
        content:
          '<p>Research indicates that cognitive changes can be influenced by multiple factors.</p>'
      },
      {
        heading: 'How This Connects to Your Report',
        content:
          '<p>Your report includes assessments that may highlight early cognitive patterns.</p>'
      },
      {
        heading: 'Practical Takeaways',
        content:
          '<p>Stay engaged in mentally stimulating activities and maintain regular health check-ups.</p>'
      }
    ],
    citations: [
      { label: 'Neurology Research', url: 'https://www.neurology.org/' }
    ]
  },
  'lifestyle-resilience': {
    title: 'Lifestyle Resilience',
    slug: 'lifestyle-resilience',
    updatedAt: '2025-01-15T00:00:00Z',
    author: 'Better Mind Care Clinician',
    sections: [
      {
        heading: 'Overview',
        content:
          '<p>Building lifestyle resilience helps protect brain health over time.</p>'
      },
      {
        heading: 'Why This Topic Matters',
        content:
          '<p>Lifestyle factors play a crucial role in long-term brain health.</p>'
      },
      {
        heading: 'What the Science Says',
        content:
          '<p>Studies show that healthy lifestyle habits can reduce cognitive decline risk.</p>'
      },
      {
        heading: 'How This Connects to Your Report',
        content:
          '<p>Your report provides personalized lifestyle recommendations.</p>'
      },
      {
        heading: 'Practical Takeaways',
        content:
          '<p>Focus on consistent healthy habits rather than perfection.</p>'
      }
    ],
    citations: [
      {
        label: 'Journal of the American Medical Association',
        url: 'https://jamanetwork.com/'
      }
    ]
  },
  'sleep-cognitive-clarity': {
    title: 'Sleep & Cognitive Clarity',
    slug: 'sleep-cognitive-clarity',
    updatedAt: '2025-01-15T00:00:00Z',
    author: 'Better Mind Care Clinician',
    sections: [
      {
        heading: 'Overview',
        content:
          '<p>Quality sleep is essential for cognitive function and brain health.</p>'
      },
      {
        heading: 'Why This Topic Matters',
        content:
          '<p>Sleep affects memory, learning, and emotional regulation.</p>'
      },
      {
        heading: 'What the Science Says',
        content:
          '<p>Research consistently links poor sleep to cognitive impairment.</p>'
      },
      {
        heading: 'How This Connects to Your Report',
        content:
          '<p>Your sleep patterns may influence your overall health assessment.</p>'
      },
      {
        heading: 'Practical Takeaways',
        content:
          '<p>Aim for 7-9 hours of quality sleep and maintain consistent sleep schedules.</p>'
      }
    ],
    citations: [
      { label: 'Sleep Foundation', url: 'https://www.sleepfoundation.org/' }
    ]
  },
  'labs-and-brain-health': {
    title: 'Labs and Brain Health',
    slug: 'labs-and-brain-health',
    updatedAt: '2025-01-15T00:00:00Z',
    author: 'Better Mind Care Clinician',
    sections: [
      {
        heading: 'Overview',
        content:
          '<p>Lab tests can provide valuable insights into brain health markers.</p>'
      },
      {
        heading: 'Why This Topic Matters',
        content:
          '<p>Understanding lab results helps you make informed health decisions.</p>'
      },
      {
        heading: 'What the Science Says',
        content:
          '<p>Certain biomarkers are associated with cognitive health outcomes.</p>'
      },
      {
        heading: 'How This Connects to Your Report',
        content:
          '<p>Your lab results are interpreted in the context of brain health.</p>'
      },
      {
        heading: 'Practical Takeaways',
        content:
          '<p>Discuss lab results with your healthcare provider for personalized guidance.</p>'
      }
    ],
    citations: [
      { label: 'American Heart Association', url: 'https://www.heart.org/' }
    ]
  }
};

function Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const articleData = articlesData[slug];
    if (articleData) {
      setArticle(articleData);
    }
  }, [slug]);

  if (!article) {
    return (
      <div className="article-page">
        <h1>Article not found</h1>
        <BackToResources />
      </div>
    );
  }

  return (
    <div className="article-page">
      <ArticleHero
        title={article.title}
        author={article.author}
        updatedAt={article.updatedAt}
      />

      <div className="article-content">
        <ArticleTOC
          sections={article.sections}
          activeSection={activeSection}
          onSectionClick={setActiveSection}
        />

        <ArticleBody
          sections={article.sections}
          onSectionVisible={setActiveSection}
        />
      </div>

      <ArticleCitations citations={article.citations} />

      <BackToResources />
    </div>
  );
}

export default Article;
