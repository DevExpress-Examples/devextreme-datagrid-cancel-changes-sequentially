import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeContent from '../HomeContent.vue';

vi.mock('devextreme-aspnet-data-nojquery', () => ({
  createStore: () => [],
}));

describe('HomeContent', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(HomeContent);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders the orders grid', async () => {
    expect(wrapper.find('.dx-datagrid').exists()).toBe(true);
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Order ID');
      expect(wrapper.text()).toContain('Ship Name');
    });
  });

  it('renders the undo options with a default limit of 50', () => {
    const input = wrapper.get<HTMLInputElement>('#max-undo-steps input');

    expect(input.element.value).toBe('50');
    expect(wrapper.text()).toContain('Maximum undo steps');
    expect(wrapper.text()).toContain('Undo edit types');
    expect(wrapper.find('#undo-types').exists()).toBe(true);
  });

  it('disables undo when there are no changes', () => {
    const button = wrapper.get('[aria-label="Undo the last change"]');

    expect(button.attributes('aria-disabled')).toBe('true');
  });
});
