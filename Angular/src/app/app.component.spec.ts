import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    Object.assign(fixture.componentInstance, { dataSource: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders the orders grid', () => {
    expect(element.querySelector('.dx-datagrid')).not.toBeNull();
    expect(element.textContent).toContain('Order ID');
    expect(element.textContent).toContain('Ship Name');
  });

  it('renders the undo options with a default limit of 50', () => {
    const input = element.querySelector<HTMLInputElement>('#max-undo-steps input');

    expect(input?.value).toBe('50');
    expect(element.textContent).toContain('Maximum undo steps');
    expect(element.textContent).toContain('Undo edit types');
    expect(element.querySelector('#undo-types')).not.toBeNull();
  });

  it('disables undo when there are no changes', () => {
    const button = element.querySelector('[aria-label="Undo the last change"]');

    expect(button?.getAttribute('aria-disabled')).toBe('true');
  });
});
