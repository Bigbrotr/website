// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://bigbrotr.com',
	integrations: [
		starlight({
			title: 'BigBrotr',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/bigbrotr/bigbrotr' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Implementations', slug: 'getting-started/implementations' },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'Overview', slug: 'architecture/overview' },
						{ label: 'Core Layer', slug: 'architecture/core-layer' },
						{ label: 'Service Layer', slug: 'architecture/service-layer' },
					],
				},
				{
					label: 'Services',
					items: [
						{ label: 'Initializer', slug: 'services/initializer' },
						{ label: 'Finder', slug: 'services/finder' },
						{ label: 'Monitor', slug: 'services/monitor' },
						{ label: 'Synchronizer', slug: 'services/synchronizer' },
					],
				},
				{
					label: 'Database',
					items: [
						{ label: 'Schema Overview', slug: 'database/schema' },
						{ label: 'Tables', slug: 'database/tables' },
						{ label: 'Views & Procedures', slug: 'database/views-procedures' },
					],
				},
				{
					label: 'Configuration',
					items: [
						{ label: 'Overview', slug: 'configuration/overview' },
						{ label: 'Core Configuration', slug: 'configuration/core' },
						{ label: 'Service Configuration', slug: 'configuration/services' },
					],
				},
				{
					label: 'Resources',
					items: [
						{ label: 'FAQ', slug: 'resources/faq' },
						{ label: 'Contributing', slug: 'resources/contributing' },
					],
				},
			],
		}),
	],
});
