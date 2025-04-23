import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed realistic scenarios based on the NDNEcoldstartscenarios.md file.
 * These will be used during onboarding to create more personalized and relevant questions.
 */
async function seedScenarios() {
  console.log('Seeding realistic scenarios for onboarding...');

  // Create user archetypes from the scenarios document
  const userArchetypes = [
    {
      name: 'Maria',
      description: 'Downtown retailer who runs a café on 6th Street, politically moderate-left',
      interests: [
        'Supporting local businesses',
        'Downtown vitality and safety',
        'Sustainable infrastructure'
      ],
      concerns: [
        'Homelessness impact on retail',
        'Rising business costs',
        'Tourism promotion'
      ]
    },
    {
      name: 'Bill',
      description: 'Retired veteran on fixed income, property-rich but cash-constrained',
      interests: [
        'Public safety',
        'Property value preservation',
        'Limited tax increases'
      ],
      concerns: [
        'Rising utility costs',
        'Fixed income constraints',
        'Property rights'
      ]
    },
    {
      name: 'Ezra',
      description: '26-year-old environmental graduate student who bikes everywhere',
      interests: [
        'Environmental protection',
        'Active transportation',
        'Climate action'
      ],
      concerns: [
        'Urban sprawl',
        'Car-centric planning',
        'Water quality'
      ]
    },
    {
      name: 'Skylar',
      description: 'Cannabis farmer who operates a rural Tier II grow operation',
      interests: [
        'Agricultural regulations',
        'Water rights',
        'Business-friendly policies'
      ],
      concerns: [
        'Regulatory compliance costs',
        'Water availability',
        'Stigmatization'
      ]
    }
  ];

  // Create proposals from the scenarios document
  const proposals = [
    {
      title: 'Water-Treatment Plant Funding Gap',
      description: 'Issue a 25-year municipal revenue bond and raise residential water rates 12% to close the $50M shortfall after FEMA\'s BRIC grant was cancelled.',
      category: 'INFRASTRUCTURE',
      stances: [
        {
          perspective: 'Infrastructure-first residents',
          opinion: 'Safe water is non-negotiable; bite the bullet now.',
          supports: true
        },
        {
          perspective: 'Fixed-income seniors',
          opinion: '12% is steep—phase it or find state help.',
          supports: false
        },
        {
          perspective: 'Small-business owners',
          opinion: 'Worry about pass-through cost hikes to restaurants & breweries.',
          supports: false
        }
      ],
      probeQuestion: 'If closing a funding gap means your monthly bill rises ~$6, do you prefer: (a) pay now, (b) slower phased hike, (c) seek new state/federal grants even if construction is delayed)?'
    },
    {
      title: 'Downtown Homeless "Resting Sites" Expansion',
      description: 'Approve two adjacent parking-lot campsites, bringing total capacity to 150 tents, as ordered by the court.',
      category: 'SOCIAL_SERVICES',
      stances: [
        {
          perspective: 'Downtown retail',
          opinion: 'Fears customer flight; supports dispersing camps.',
          supports: false
        },
        {
          perspective: 'Service-provider NGOs',
          opinion: 'Support concentrated sites for easier outreach.',
          supports: true
        },
        {
          perspective: 'Libertarian voters',
          opinion: 'Prefer enforcing anti-camping laws post-Johnson decision.',
          supports: false
        }
      ],
      probeQuestion: 'Which matters more: reducing sidewalk camping city-wide or spreading managed sites across neighborhoods to share impacts?'
    },
    {
      title: 'Wildfire-Risk Utility Surcharge',
      description: 'Endorse Pacific Power\'s plan to add a temporary $2/month surcharge to speed undergrounding and covered-conductor projects (500 mi planned, 100 mi in 2025).',
      category: 'PUBLIC_SAFETY',
      stances: [
        {
          perspective: 'Fire-concerned homeowners',
          opinion: 'Strongly support—cheaper than losing a home.',
          supports: true
        },
        {
          perspective: 'Low-income advocates',
          opinion: 'Want income-based credits first.',
          supports: false
        },
        {
          perspective: 'Outdoor recreation business',
          opinion: 'Favor, emphasize tourism reliability.',
          supports: true
        }
      ],
      probeQuestion: 'Would you accept a dedicated $2 utility fee if it demonstrably cut local wildfire ignition risk by 30%?'
    },
    {
      title: 'Transportation System Plan (TSP) Priority Package',
      description: 'Adopt the TSP\'s "Active Streets" scenario, reallocating $5M from road-widening to bike & sidewalk links near two I-5 interchanges.',
      category: 'TRANSPORTATION',
      stances: [
        {
          perspective: 'Cyclists & students',
          opinion: 'Support—safer routes to school.',
          supports: true
        },
        {
          perspective: 'Commuter drivers',
          opinion: 'Oppose—predict worse congestion.',
          supports: false
        },
        {
          perspective: 'Climate-action group',
          opinion: 'Insist on even bolder mode-shift targets.',
          supports: true
        }
      ],
      probeQuestion: 'Rank these in order of importance for new transportation dollars: smoother car traffic, safer bike/walk routes, expanded city bus service.'
    },
    {
      title: 'Cannabis Compliance Reform',
      description: 'Cut Josephine County\'s marijuana "certificate of compliance" fee from $500 to $250, but add mandatory water-use reporting to address Rogue River withdrawals.',
      category: 'REGULATION',
      stances: [
        {
          perspective: 'Licensed growers',
          opinion: 'Back lower fees, balk at extra paperwork.',
          supports: true
        },
        {
          perspective: 'Irrigation district',
          opinion: 'Wants strict usage audits.',
          supports: false
        },
        {
          perspective: 'Public-health coalition',
          opinion: 'Push for stronger odor-control rules instead.',
          supports: false
        }
      ],
      probeQuestion: 'When regulating local cannabis farms, is affordability for legal growers or tight water-use oversight more important to you?'
    },
    {
      title: 'Lodging-Tax Reallocation',
      description: 'Shift 10% of the city\'s 12% Transient Lodging Tax from tourism marketing to police & fire to avoid a separate levy hike.',
      category: 'BUDGET',
      stances: [
        {
          perspective: 'Hotel/restaurant owners',
          opinion: 'Oppose—fear losing promotional dollars.',
          supports: false
        },
        {
          perspective: 'Public-safety supporters',
          opinion: 'Note voters renew levies every few years anyway—prefer stable base funding.',
          supports: true
        },
        {
          perspective: 'Arts & tourism board',
          opinion: 'Offer compromise—sunset clause after three years.',
          supports: false
        }
      ],
      probeQuestion: 'If you had $100 of lodging-tax revenue, how much would you direct to tourism promotion vs. public safety?'
    }
  ];

  // Save data to database using prisma
  try {
    // Store archetypes
    for (const archetype of userArchetypes) {
      await prisma.exampleUserArchetype.upsert({
        where: { name: archetype.name },
        update: {
          description: archetype.description,
          interests: archetype.interests,
          concerns: archetype.concerns
        },
        create: {
          name: archetype.name,
          description: archetype.description,
          interests: archetype.interests as any,
          concerns: archetype.concerns as any
        }
      }).catch(e => {
        // If the table doesn't exist yet, log and continue
        console.log(`Note: Could not save archetype - ExampleUserArchetype table may not exist yet: ${e.message}`);
      });
    }

    // Store proposals
    for (const proposal of proposals) {
      await prisma.exampleProposal.upsert({
        where: { title: proposal.title },
        update: {
          description: proposal.description,
          category: proposal.category,
          stances: proposal.stances as any,
          probeQuestion: proposal.probeQuestion
        },
        create: {
          title: proposal.title,
          description: proposal.description,
          category: proposal.category,
          stances: proposal.stances as any,
          probeQuestion: proposal.probeQuestion
        }
      }).catch(e => {
        // If the table doesn't exist yet, log and continue
        console.log(`Note: Could not save proposal - ExampleProposal table may not exist yet: ${e.message}`);
      });
    }

    console.log('Scenarios seeded successfully!');
  } catch (error) {
    console.error('Error seeding scenarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedScenarios().catch(e => {
  console.error('Error running seed script:', e);
  process.exit(1);
});