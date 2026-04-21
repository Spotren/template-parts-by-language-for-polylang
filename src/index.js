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
		const templatePartRecords = useSelect(
			( select ) =>
				select( coreDataStore ).getEntityRecords( 'postType', 'wp_template_part', {
					context: 'edit',
					per_page: -1,
				} ),
			[]
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

			if ( ! props.isSelected || context || error ) {
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
		}, [ props.isSelected, context, error ] );

		const overrides = normalizeOverrides( props.attributes[ ATTRIBUTE_NAME ] );
		const baseSlug = props.attributes.slug || '';
		const templateParts = normalizeTemplatePartRecords( templatePartRecords );
		const languages = context && Array.isArray( context.languages ) ? context.languages : [];

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

		const controls = createElement(
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
