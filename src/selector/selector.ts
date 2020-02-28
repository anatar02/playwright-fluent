import * as action from '../actions';
import { PlaywrightController } from '../controller';
import { VerboseOptions, defaultVerboseOptions } from '../actions';
import { ElementHandle } from 'playwright';
type Action = (handles: ElementHandle<Element>[]) => Promise<ElementHandle<Element>[]>;

interface ActionInfoWithoutParam {
  name: 'parent' | 'unknown';
}
interface ActionInfoWithSelector {
  name: 'querySelectorAllInPage' | 'find';
  selector: string;
}
interface ActionInfoWithText {
  name: 'withText' | 'withValue';
  text: string;
}
interface ActionInfoWithIndex {
  name: 'nth';
  index: number;
}

type ActionInfo =
  | ActionInfoWithoutParam
  | ActionInfoWithSelector
  | ActionInfoWithText
  | ActionInfoWithIndex;

interface SelectorState {
  actions: ActionInfo[];
  chainingHistory: string;
}

export class SelectorController {
  private chainingHistory = '';
  private pwc: PlaywrightController;

  private actionInfos: ActionInfo[] = [];

  private getActionFrom(actionInfo: ActionInfo): Action {
    switch (actionInfo.name) {
      case 'querySelectorAllInPage':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return () => action.querySelectorAllInPage(actionInfo.selector, this.pwc.currentPage());

      case 'find':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return (handles) => action.querySelectorAllFromHandles(actionInfo.selector, [...handles]);

      case 'nth':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return (handles) => action.getNthHandle(actionInfo.index, [...handles]);

      case 'parent':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return (handles) => action.getParentsOf([...handles]);

      case 'withText':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return (handles) => action.getHandlesWithText(actionInfo.text, [...handles]);

      case 'withValue':
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        return (handles) => action.getHandlesWithValue(actionInfo.text, [...handles]);

      default:
        throw new Error(`Action '${actionInfo.name}' is not yet implemented`);
    }
  }

  private async executeActions(): Promise<ElementHandle<Element>[]> {
    let handles: ElementHandle<Element>[] = [];
    for (let index = 0; index < this.actionInfos.length; index++) {
      const action = this.getActionFrom(this.actionInfos[index]);
      handles = await action([...handles]);
    }
    return handles;
  }

  /**
   * Executes the search.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   *
   * @returns {Promise<ElementHandle<Element>[]>} will return an empty array if no elements are found, will return all found elements otherwise.
   * @memberof SelectorController
   */
  public async getAllHandles(): Promise<ElementHandle<Element>[]> {
    const handles = await this.executeActions();
    return handles;
  }

  /**
   * Executes the search and returns the first found element.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   *
   * @returns {Promise<ElementHandle<Element> | null>} will return null if no elements are found, will return first found element otherwise.
   * @memberof SelectorController
   */
  public async getFirstHandleOrNull(): Promise<ElementHandle<Element> | null> {
    const handles = await this.executeActions();
    if (handles.length === 0) {
      return null;
    }
    return handles[0];
  }

  /**
   * Executes the search and returns the first found element.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   *
   * @returns {Promise<ElementHandle<Element> | null>} will return null if no elements are found, will return first found element otherwise.
   * @memberof SelectorController
   */
  public async getHandle(): Promise<ElementHandle<Element> | null> {
    const handles = await this.executeActions();
    if (handles.length === 0) {
      return null;
    }
    return handles[0];
  }

  /**
   * Gets the number of found elements.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   *
   * @returns {Promise<number>} will return 0 if no elements are found.
   * @memberof SelectorController
   */
  public async count(): Promise<number> {
    const handles = await this.executeActions();
    return handles.length;
  }

  /**
   *
   */
  constructor(selector: string, pptc: PlaywrightController, stringifiedState?: string) {
    this.pwc = pptc;

    if (stringifiedState) {
      const state = JSON.parse(stringifiedState) as SelectorState;
      this.chainingHistory = state.chainingHistory;
      this.actionInfos = state.actions;
      return;
    }

    this.chainingHistory = `selector(${selector})`;
    this.actionInfos.push({ name: 'querySelectorAllInPage', selector });
  }

  public toString(): string {
    return this.chainingHistory;
  }

  private createSelectorFrom(
    selector: string,
    actions: ActionInfo[],
    chainingHistory: string,
  ): SelectorController {
    const state: SelectorState = {
      actions,
      chainingHistory,
    };

    return new SelectorController(selector, this.pwc, JSON.stringify(state));
  }
  public find(selector: string): SelectorController {
    const actions = [...this.actionInfos];
    actions.push({ name: 'find', selector });

    const chainingHistory = `${this.chainingHistory}
  .find(${selector})`;

    return this.createSelectorFrom(selector, actions, chainingHistory);
  }

  /**
   * Finds, from previous search, all elements whose innerText contains the specified text
   *
   * @param {string} text
   * @returns {SelectorController}
   * @memberof SelectorController
   */
  public withText(text: string): SelectorController {
    const actions = [...this.actionInfos];
    actions.push({ name: 'withText', text });

    const chainingHistory = `${this.chainingHistory}
  .withText(${text})`;

    return this.createSelectorFrom(text, actions, chainingHistory);
  }

  /**
   * Finds, from previous search, all elements whose value contains the specified text
   *
   * @param {string} text
   * @returns {SelectorController}
   * @memberof SelectorController
   */
  public withValue(text: string): SelectorController {
    const actions = [...this.actionInfos];
    actions.push({ name: 'withValue', text });

    const chainingHistory = `${this.chainingHistory}
  .withValue(${text})`;

    return this.createSelectorFrom(text, actions, chainingHistory);
  }

  public parent(): SelectorController {
    const actions = [...this.actionInfos];
    actions.push({ name: 'parent' });

    const chainingHistory = `${this.chainingHistory}
  .parent()`;

    return this.createSelectorFrom('', actions, chainingHistory);
  }

  /**
   * Takes the nth element found at the previous step
   *
   * @param {number} index : 1-based index
   * @returns {SelectorController}
   * @memberof SelectorController
   * @example
   * nth(1): take the first element found at previous step.
   * nth(-1): take the last element found at previous step.
   */
  public nth(index: number): SelectorController {
    const actions = [...this.actionInfos];
    actions.push({ name: 'nth', index });

    const chainingHistory = `${this.chainingHistory}
  .nth(${index})`;

    return this.createSelectorFrom('', actions, chainingHistory);
  }

  /**
   * Checks if selector exists.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   * So the disability status is the one known when executing this method.
   *
   * @returns {Promise<boolean>}
   * @memberof SelectorController
   */
  public async exists(): Promise<boolean> {
    const handle = await this.getFirstHandleOrNull();
    if (handle === null) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the selector is visible.
   * If the selector targets multiple DOM elements, this check is done only on the first one found.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   * So the visibilty status is the one known when executing this method.
   * @param {Partial<VerboseOptions>} [options=defaultVerboseOptions]
   * @returns {Promise<boolean>}
   * @memberof SelectorController
   */
  public async isVisible(
    options: Partial<VerboseOptions> = defaultVerboseOptions,
  ): Promise<boolean> {
    const verboseOptions = {
      ...defaultVerboseOptions,
      options,
    };
    const handle = await this.getHandle();
    const isElementVisible = await action.isHandleVisible(handle, verboseOptions);
    return isElementVisible;
  }

  /**
   * Checks that the selector is not visible.
   * If the selector targets multiple DOM elements, this check is done only on the first one found.
   * The result may differ from one execution to another
   * especially if targeted element is rendered lately because its data is based on some backend response.
   * So the visibilty status is the one known when executing this method.
   * @param {Partial<VerboseOptions>} [options=defaultVerboseOptions]
   * @returns {Promise<boolean>}
   * @memberof SelectorController
   */
  public async isNotVisible(
    options: Partial<VerboseOptions> = defaultVerboseOptions,
  ): Promise<boolean> {
    const verboseOptions = {
      ...defaultVerboseOptions,
      options,
    };
    const handle = await this.getHandle();
    const isElementNotVisible = await action.isHandleNotVisible(handle, verboseOptions);
    return isElementNotVisible;
  }
}
