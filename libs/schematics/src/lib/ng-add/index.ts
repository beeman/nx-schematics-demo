import {
  chain,
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  getProjectConfig,
  readWorkspaceConfigPath,
  updateJsonInTree,
} from '@nrwl/workspace';
import { existsSync } from 'fs';
import { join } from 'path';
import { Schema } from './schema';

function addPackages() {
  return updateJsonInTree('package.json', (packageJson) => {
    if (!packageJson['dependencies']) {
      packageJson['dependencies'] = {};
    }

    if (!packageJson['dependencies']['@kikstart-playground/themes']) {
      packageJson['dependencies']['@kikstart-playground/themes'] = '^1.3.3';
    }

    return packageJson;
  });
}

function addTasks(options: Schema) {
  return (host: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask('.'));
    }
  };
}

function addStyles(options: Schema, config: any) {
  console.log('CONFIG', config);
  return (host: Tree, context: SchematicContext) => {
    const styles = config?.architect?.build?.options?.styles;
    if (!styles.length) {
      context.logger.error(`Can not read styles`);
      throw new Error();
    }
    const stylePath = join(styles[0]);

    if (!existsSync(stylePath)) {
      context.logger.error(`Can not find ${stylePath}`);
      throw new Error();
    }
    const content = host.read(stylePath);
    const styleImport = stylePath.endsWith('.scss')
      ? `@import "~@kikstart-playground/themes/scss/${options.theme}";`
      : `@import "~@kikstart-playground/themes/css/${options.theme}.css";`;

    if (!content.includes(styleImport)) {
      context.logger.info(`Updating stylesheet`);
      host.overwrite(stylePath, [content, styleImport].join('\n'));
    }
  };
}

export default function (options: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = readWorkspaceConfigPath();

    if (!options.project) {
      options.project = workspace.defaultProject;
    }

    const config = getProjectConfig(host, options.project);

    return chain([
      addTasks(options),
      addPackages(),
      addStyles(options, config),
    ]);
  };
}
