import { AngularElectronPage } from './app.po';
import { browser, element, by } from 'protractor';

describe('stratis-core App', () => {
  let page: AngularElectronPage;

  beforeEach(() => {
    page = new AngularElectronPage();
  });

  it('Page title should be AmsterdamCoin', () => {
    page.navigateTo('/');
    expect(page.getTitle()).toEqual('AmsterdamCoin');
  });
});
