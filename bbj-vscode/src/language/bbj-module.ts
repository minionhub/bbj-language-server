/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    createDefaultModule, createDefaultSharedModule, DeepPartial, DefaultSharedModuleContext, inject,
    LangiumServices, LangiumSharedServices, Module, PartialLangiumServices
} from 'langium';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from './generated/module';
import { BBjValidator, registerValidationChecks } from './bbj-validator';
import { JavaInteropService } from './java-interop';
import { BbjNameProvider, BbjScopeComputation, BbjScopeProvider } from './bbj-scope';
import { BBjWorkspaceManager } from './bbj-ws-manager';
import { BBjHoverProvider } from './bbj-hover';
import { BBjValueConverter} from './bbj-value-converter';
import { BbjLinker } from './bbj-linker';
import { BBjDocumentBuilder } from './bbj-document-builder';
import { BBjTokenBuilder } from './bbj-token-builder';
import { BBjIndexManager } from './bbj-index-manager';
import { BBjDocumentSymbolProvider } from './bbj-document-symbol';
import { BBjDocumentValidator } from './bbj-document-validator';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type BBjAddedServices = {
    validation: {
        BBjValidator: BBjValidator
    },
    java: {
        JavaInteropService: JavaInteropService
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type BBjServices = LangiumServices & BBjAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    references: {
        ScopeComputation: (services) => new BbjScopeComputation(services),
        ScopeProvider: (services) => new BbjScopeProvider(services),
        NameProvider: () => new BbjNameProvider(),
        Linker: (services) => new BbjLinker(services)
    },
    validation: {
        BBjValidator: (services) => new BBjValidator(services),
        DocumentValidator: (services) => new BBjDocumentValidator(services)
    },
    java: {
        JavaInteropService: (services) => new JavaInteropService(services)
    },
    lsp: {
        HoverProvider: (services) => new BBjHoverProvider(services),
        DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services)
    },
    parser: {
        ValueConverter: () => new BBjValueConverter(),
        TokenBuilder: () => new BBjTokenBuilder()
    }
};

export const BBjSharedModule: Module<LangiumSharedServices, DeepPartial<LangiumSharedServices>> = {
    workspace: {
        DocumentBuilder:  (services: LangiumSharedServices) => new BBjDocumentBuilder(services),
        WorkspaceManager: (services: LangiumSharedServices) => new BBjWorkspaceManager(services),
        IndexManager:  (services: LangiumSharedServices) => new BBjIndexManager(services)
    },
}

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createBBjServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    BBj: BBjServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj };
}
