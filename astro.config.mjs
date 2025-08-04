// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Bigbrotr',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Bigbrotr/bigbrotr' }],
			sidebar: [
				{
					label: 'Guides',
					items: [
						{ label: 'Getting Started', slug: 'guides/getting-started' },
						{ label: 'System Architecture', slug: 'guides/system-architecture' },
						{ label: 'Database Schema', slug: 'guides/database-schema' },
					],
				},
				{
					label: 'API',
					items: [
						{ label: 'Bigbrotr', slug: 'api/bigbrotr' },
						{ label: 'Event', slug: 'api/event' },
						{ label: 'Relay', slug: 'api/relay' },
						{ label: 'Relay Metadata', slug: 'api/relay-metadata' },
						{ label: 'Utils', slug: 'api/utils' },
					],
				}
			],
		}),
	],
});
