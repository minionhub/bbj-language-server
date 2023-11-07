/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import { describe, test } from 'vitest';

import { expectError, expectNoIssues, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module';
import { Program, isBinaryExpression, isKeyedFileStatement, isOpenStatement } from '../src/language/generated/ast';
import { findByIndex, findFirst, initializeWorkspace } from './test-helper';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

describe('BBj validation', async () => {

    await initializeWorkspace(services.shared);

    test('Symbolic link reference starts with', async () => {
        const validationResult = await validate(`
        class public List
        classend
        let map = new List(err=*next)
        
        `);

        expectNoIssues(validationResult, {
            node: findFirst(validationResult.document, isBinaryExpression),
            property: 'right'
        });

    });

    test('Open statement invalid options', async () => {
        const validationResult = await validate(`
        OPEN (unt,mod="",time="")"path/"+"html.png"
        `);

        expectError(validationResult, 'OPEN verb can have following two optional options: mode,tim. Found: mod,time.', {
            node: findFirst(validationResult.document, isOpenStatement),
            property: 'options'
        });

    });

    test('Open statement valid options', async () => {
        const validationResult = await validate(`
        OPEN (unt,mode="12",tim=12)"path/"+"html.png"
        OPEN (unt,mode="12")"path/"+"html.png"
        OPEN (unt,tim=12)"path/"+"html.png"
        OPEN (unt)"path/"+"html.png"
        `);

        expectNoIssues(validationResult);

    });

    test('KeyedFile statement valid options', async () => {
        const validationResult = await validate(`
        MKEYED "MYFILE",10,80,1000,MODE="somemode"
        `);
        expectNoIssues(validationResult);

    });

    test('KeyedFile statement invalid options', async () => {
        const validationResult = await validate(`
        VKEYED "MYFILE",10,80,1000,MODE="somemode"
        XKEYED "MYFILE",10,80,1000,MODE="somemode"
        `);

        expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
            node: findFirst(validationResult.document, isKeyedFileStatement),
            property: 'mode'
        });
        expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
            node: findByIndex(validationResult.document, isKeyedFileStatement, 1),
            property: 'mode'
        });
    });
    test('Labels followed by code', async () => {
        const validationResult = await validate(`
        seterr stderr
        setesc stdesc

        goto byebye

        stdesc: REM standard escape routine
        stderr: REM standard error routine

        byebye: bye
        `);

        expectNoIssues(validationResult);
    });

});