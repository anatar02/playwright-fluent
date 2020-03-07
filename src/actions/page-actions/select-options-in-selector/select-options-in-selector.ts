import { SelectOptions, selectOptionsInHandle } from '../../handle-actions';
import { getHandleOf } from '../get-handle-of';
import { WaitUntilOptions, defaultWaitUntilOptions } from '../../../utils';
import { Page } from 'playwright';

export async function selectOptionsInSelector(
  selector: string,
  labels: string[],
  page: Page | undefined,
  options: SelectOptions,
): Promise<void> {
  if (!page) {
    throw new Error(`Cannot select options '${labels}' because no browser has been launched`);
  }

  const waitOptions: WaitUntilOptions = {
    ...defaultWaitUntilOptions,
    ...options,
  };

  const handle = await getHandleOf(selector, page, waitOptions);
  await selectOptionsInHandle(handle, selector, labels, page, options);
}
