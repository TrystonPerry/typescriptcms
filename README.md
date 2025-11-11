# TypeScript CMS

This is a very terrible, but working, example of building a CMS that leverages basic json schema files to generate TS safe cms content for your website / app.

## Goal

The goal is to create an easy-to-use CMS that stores your content in your front-end, rather than a database. This way your content is available at build-time and it's easy to version control your content with git.

### Developer first

This project is aimed to be developer focused. You can edit the contnet and schema directly in your editor, and the content will immediately be reflected in your website / app.

### For non-developers too

In the future, we will have an admin panel that will leverage GitHub and a slick UI for non-developers to edit the content by leveraging the schema files defined in your /cms folder.

## How it works

This project uses a plugin to watch for changes to the json schema files in the `src/cms` directory and generate a TS file for each schema file. The TS file is then imported into your main.ts file and used to render your website / app. Because we export each type as a const, you get amazing toolips in VS code that shows the exact value of the variables. Meaning the content itself, is always at your fingertips.
