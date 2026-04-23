import apiFetch from '@wordpress/api-fetch';
import { InspectorControls } from '@wordpress/block-editor';
import { Button, Flex, FlexBlock, FlexItem, PanelBody, Notice, SelectControl, Spinner } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { store as coreDataStore } from '@wordpress/core-data';
import { dispatch, useSelect } from '@wordpress/data';
import { Fragment, createElement, useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';

const ATTRIBUTE_NAME = window.tplByPolylangConfig?.attribute || 'tplbypolylangOverrides';
const LANGUAGES_PATH = window.tplByPolylangConfig?.languagesPath || '/template-parts-by-language-for-polylang/v1/languages';
const ACTIVE_THEME = window.tplByPolylangConfig?.activeTheme || '';
const SITE_EDITOR_URL = window.tplByPolylangConfig?.siteEditorUrl || '/wp-admin/site-editor.php';
const SHOW_ON_FRONT = window.tplByPolylangConfig?.showOnFront || 'posts';
const PAGE_ON_FRONT = Number( window.tplByPolylangConfig?.pageOnFront || 0 );
const PAGE_FOR_POSTS = Number( window.tplByPolylangConfig?.pageForPosts || 0 );
const TEXT_DOMAIN = 'template-parts-by-language-for-polylang';

let cachedContext = null;
let cachedRequest = null;

function loadContext() {
	if ( cachedContext ) {
		return Promise.resolve( cachedContext );
	}

	if ( cachedRequest ) {
		return cachedRequest;
	}

	cachedRequest = apiFetch( { path: LANGUAGES_PATH } )
		.then( ( response ) => {
			cachedContext = response;
			return response;
		} )
		.catch( ( error ) => {
			cachedRequest = null;
			throw error;
		} );

	return cachedRequest;
}

function clearContextCache() {
	cachedContext = null;
	cachedRequest = null;
}

function normalizeOverrides( overrides ) {
	if ( ! overrides || typeof overrides !== 'object' || Array.isArray( overrides ) ) {
		return {};
	}

	return overrides;
}

function formatTemplatePartLabel( part ) {
	return part.title || part.slug || '';
}

function buildTemplatePartOptions( templateParts, baseSlug ) {
	const options = [
		{
			label: baseSlug
				? sprintf(
					/* translators: %s: Template part slug. */
					__( 'Use default (%s)', TEXT_DOMAIN ),
					baseSlug
				)
				: __( 'Use default template part', TEXT_DOMAIN ),
			value: '',
		},
	];

	( templateParts || [] ).forEach( ( part ) => {
		options.push( {
			label: formatTemplatePartLabel( part ),
			value: part.slug,
		} );
	} );

	return options;
}

function normalizeTemplatePartRecords( records ) {
	if ( ! Array.isArray( records ) ) {
		return [];
	}

	return records
		.map( ( record ) => {
			const renderedTitle =
				record?.title && typeof record.title === 'object' && record.title.rendered
					? record.title.rendered
					: '';

			return {
				slug: record?.slug || '',
				title: renderedTitle || record?.slug || '',
			};
		} )
		.filter( ( part ) => !! part.slug )
		.sort( ( left, right ) => left.title.localeCompare( right.title ) );
}

function normalizeTemplateRecords( records ) {
	if ( ! Array.isArray( records ) ) {
		return [];
	}

	return records
		.map( ( record ) => {
			const renderedTitle =
				record?.title && typeof record.title === 'object' && record.title.rendered
					? record.title.rendered
					: '';

			return {
				id: record?.id || '',
				slug: record?.slug || '',
				title: renderedTitle || record?.slug || '',
			};
		} )
		.filter( ( template ) => !! template.id && !! template.slug );
}

function normalizeTemplateId( templateId ) {
	if ( typeof templateId !== 'string' ) {
		return '';
	}

	const normalizedTemplateId = templateId.trim();

	if ( ! normalizedTemplateId || 'default' === normalizedTemplateId ) {
		return '';
	}

	if ( normalizedTemplateId.includes( '//' ) ) {
		return normalizedTemplateId;
	}

	return ACTIVE_THEME ? `${ ACTIVE_THEME }//${ normalizedTemplateId }` : normalizedTemplateId;
}

function getTemplateSlugFromId( templateId ) {
	if ( ! templateId ) {
		return '';
	}

	const templateIdParts = templateId.split( '//' );

	return templateIdParts[ 1 ] || templateId;
}

function buildTemplateEditUrl( templateId ) {
	if ( ! templateId ) {
		return '';
	}

	return `${ SITE_EDITOR_URL }?postType=wp_template&postId=${ encodeURIComponent( templateId ) }`;
}

function isEditingTemplate() {
	const queryParams = new URLSearchParams( window.location.search );

	return queryParams.get( 'postType' ) === 'wp_template';
}

function findTemplateBySlug( templates, slug ) {
	return ( templates || [] ).find( ( template ) => template.slug === slug ) || null;
}

function resolvePageTemplateId( { currentPostId, editedPageTemplate }, templates ) {
	if ( editedPageTemplate ) {
		return editedPageTemplate;
	}

	const templateCandidates = [];

	if ( SHOW_ON_FRONT === 'page' && currentPostId === PAGE_ON_FRONT ) {
		templateCandidates.push( 'front-page', 'home', 'page', 'index' );
	} else if ( SHOW_ON_FRONT === 'page' && currentPostId === PAGE_FOR_POSTS ) {
		templateCandidates.push( 'home', 'index' );
	} else {
		templateCandidates.push( 'page', 'singular', 'index' );
	}

	const matchingTemplate = templateCandidates
		.map( ( slug ) => findTemplateBySlug( templates, slug ) )
		.find( Boolean );

	return matchingTemplate?.id || '';
}

addFilter(
	'blocks.registerBlockType',
	'template-parts-by-language-for-polylang/attribute',
	( settings, name ) => {
		if ( name !== 'core/template-part' ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				[ ATTRIBUTE_NAME ]: {
					type: 'object',
					default: {},
				},
			},
		};
	}
);

const withLanguageOverrides = createHigherOrderComponent( ( BlockEdit ) => {
	return function TemplatePartLanguageOverrides( props ) {
		if ( props.name !== 'core/template-part' ) {
			return createElement( BlockEdit, props );
		}

		const [ context, setContext ] = useState( cachedContext );
		const [ error, setError ] = useState( null );
		const [ isRefreshing, setIsRefreshing ] = useState( false );
		const editorContext = useSelect(
			( select ) => {
				const postEditorStore = select( 'core/editor' );
				const currentPostType =
					typeof postEditorStore?.getCurrentPostType === 'function'
						? postEditorStore.getCurrentPostType()
						: '';
				const currentPostId =
					typeof postEditorStore?.getCurrentPostId === 'function'
						? Number( postEditorStore.getCurrentPostId() || 0 )
						: 0;
				const editedPageTemplate =
					currentPostType === 'page' && typeof postEditorStore?.getEditedPostAttribute === 'function'
						? postEditorStore.getEditedPostAttribute( 'template' )
						: '';

				return {
					currentPostId,
					currentPostType,
					editedPageTemplate: normalizeTemplateId( editedPageTemplate ),
					isTemplateEditor: isEditingTemplate() || currentPostType === 'wp_template',
				};
			},
			[]
		);
		const templateRecords = useSelect(
			( select ) => {
				if ( editorContext.currentPostType !== 'page' && ! editorContext.isTemplateEditor ) {
					return [];
				}

				return select( coreDataStore ).getEntityRecords( 'postType', 'wp_template', {
					context: 'edit',
					per_page: -1,
				} );
			},
			[ editorContext.currentPostType, editorContext.isTemplateEditor ]
		);
		const templatePartRecords = useSelect(
			( select ) => {
				if ( ! editorContext.isTemplateEditor ) {
					return [];
				}

				return select( coreDataStore ).getEntityRecords( 'postType', 'wp_template_part', {
					context: 'edit',
					per_page: -1,
				} );
			},
			[ editorContext.isTemplateEditor ]
		);

		function refreshContext() {
			setIsRefreshing( true );
			setError( null );
			clearContextCache();
			dispatch( coreDataStore ).invalidateResolution( 'getEntityRecords', [
				'postType',
				'wp_template_part',
				{
					context: 'edit',
					per_page: -1,
				},
			] );

			loadContext()
				.then( ( response ) => {
					setContext( response );
				} )
				.catch( ( fetchError ) => {
					setError( fetchError );
				} )
				.finally( () => {
					setIsRefreshing( false );
				} );
		}

		useEffect( () => {
			let mounted = true;

			if ( ! props.isSelected || ! editorContext.isTemplateEditor || context || error ) {
				return () => {
					mounted = false;
				};
			}

			setIsRefreshing( true );

			loadContext()
				.then( ( response ) => {
					if ( mounted ) {
						setContext( response );
					}
				} )
				.catch( ( fetchError ) => {
					if ( mounted ) {
						setError( fetchError );
					}
				} )
				.finally( () => {
					if ( mounted ) {
						setIsRefreshing( false );
					}
				} );

			return () => {
				mounted = false;
			};
		}, [ props.isSelected, editorContext.isTemplateEditor, context, error ] );

		const overrides = normalizeOverrides( props.attributes[ ATTRIBUTE_NAME ] );
		const baseSlug = props.attributes.slug || '';
		const templates = normalizeTemplateRecords( templateRecords );
		const templateParts = normalizeTemplatePartRecords( templatePartRecords );
		const languages = context && Array.isArray( context.languages ) ? context.languages : [];
		const pageTemplateId =
			editorContext.currentPostType === 'page'
				? resolvePageTemplateId(
					{
						currentPostId: editorContext.currentPostId,
						editedPageTemplate: editorContext.editedPageTemplate,
					},
					templates
				)
				: '';
		const pageTemplateLabel = getTemplateSlugFromId( pageTemplateId );
		const pageTemplateEditUrl = buildTemplateEditUrl( pageTemplateId );

		function updateLanguageOverride( languageSlug, nextSlug ) {
			const nextOverrides = { ...overrides };

			if ( nextSlug ) {
				nextOverrides[ languageSlug ] = nextSlug;
			} else {
				delete nextOverrides[ languageSlug ];
			}

			props.setAttributes( {
				[ ATTRIBUTE_NAME ]: nextOverrides,
			} );
		}

		let controls = null;

		if ( editorContext.isTemplateEditor ) {
			controls = createElement(
				InspectorControls,
				null,
				createElement(
					PanelBody,
					{
						title: __( 'Language Overrides', TEXT_DOMAIN ),
						initialOpen: true,
					},
					createElement(
						Flex,
						{
							align: 'center',
							justify: 'space-between',
						},
						createElement(
							FlexBlock,
							null,
							createElement(
								'p',
								null,
								createElement( 'strong', null, __( 'Base template part:', TEXT_DOMAIN ) + ' ' ),
								baseSlug ? createElement( 'code', null, baseSlug ) : '—'
							)
						),
						createElement(
							FlexItem,
							null,
							createElement(
								Button,
								{
									variant: 'secondary',
									isSmall: true,
									isBusy: isRefreshing,
									onClick: refreshContext,
								},
								__( 'Refresh', TEXT_DOMAIN )
							)
						)
					),
					( ( ! context && ! error ) || isRefreshing ) && createElement( Spinner, null ),
					error &&
						createElement(
							Notice,
							{
								status: 'error',
								isDismissible: false,
							},
							__( 'Could not load Polylang languages.', TEXT_DOMAIN )
						),
					context &&
						! context.polylangActive &&
						createElement(
							Notice,
							{
								status: 'warning',
								isDismissible: false,
							},
							__( 'Polylang is not active. Overrides are disabled until the plugin is available.', TEXT_DOMAIN )
						),
					context &&
						context.polylangActive &&
						languages.length === 0 &&
						createElement(
							Notice,
							{
								status: 'warning',
								isDismissible: false,
							},
							__( 'No Polylang languages were found. Configure Polylang languages first.', TEXT_DOMAIN )
						),
					context &&
						context.polylangActive &&
						languages.map( ( language ) => {
							const selectedSlug = overrides[ language.slug ] || '';

							return createElement( SelectControl, {
								key: language.slug,
								label: sprintf(
									/* translators: 1: Language name, 2: Language slug. */
									__( '%1$s (%2$s)', TEXT_DOMAIN ),
									language.name,
									language.slug
								),
								value: selectedSlug,
								options: buildTemplatePartOptions( templateParts, baseSlug ),
								onChange: ( value ) => {
									updateLanguageOverride( language.slug, value );
								},
								help: selectedSlug
									? sprintf(
										/* translators: 1: Base slug, 2: Override slug, 3: Language slug. */
										__( 'Replaces %1$s with %2$s when the current language is %3$s.', TEXT_DOMAIN ),
										baseSlug || '—',
										selectedSlug,
										language.slug
									)
									: __( 'Uses the base template part for this language.', TEXT_DOMAIN ),
							} );
						} ),
					createElement(
						Notice,
						{
							status: 'info',
							isDismissible: false,
						},
						__(
							'Overrides apply on the frontend render. The Site Editor preview keeps the base template part in this version.',
							TEXT_DOMAIN
						)
					)
				)
			);
		} else if ( editorContext.currentPostType === 'page' && pageTemplateId && pageTemplateEditUrl ) {
			controls = createElement(
				InspectorControls,
				null,
				createElement(
					PanelBody,
					{
						title: __( 'Language Overrides', TEXT_DOMAIN ),
						initialOpen: true,
					},
					createElement(
						Notice,
						{
							status: 'info',
							isDismissible: false,
						},
						createElement(
							'p',
							null,
							__(
								'Language overrides for this template part can only be edited from the template that renders this page.',
								TEXT_DOMAIN
							)
						),
						createElement(
							'p',
							null,
							createElement(
								'a',
								{
									href: pageTemplateEditUrl,
								},
								pageTemplateLabel
									? sprintf(
										/* translators: %s: Template slug. */
										__( 'Edit template: %s', TEXT_DOMAIN ),
										pageTemplateLabel
									)
									: __( 'Edit page template', TEXT_DOMAIN )
							)
						)
					)
				)
			);
		}

		return createElement(
			Fragment,
			null,
			createElement( BlockEdit, props ),
			controls
		);
	};
}, 'withTemplatePartLanguageOverrides' );

addFilter(
	'editor.BlockEdit',
	'template-parts-by-language-for-polylang/inspector-controls',
	withLanguageOverrides
);
