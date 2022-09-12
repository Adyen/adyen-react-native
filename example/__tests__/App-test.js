/**
 * @format
 */

// import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

export function renderWithNavigation(ui) {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}

import PaymentMethods from '@adyen/react-native';
import PaymentMethodsProvider from '@adyen/react-native';

it('renders correctly', () => {
  renderWithNavigation(<PaymentMethodsProvider>
    <PaymentMethods />
  </PaymentMethodsProvider> );
});


/* ]

import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuestionsBoard } from '../QuestionsBoard';

test('form submits two answers', () => {
  const allQuestions = ['q1', 'q2'];
  const mockFn = jest.fn();

  render(<QuestionsBoard questions={allQuestions} onSubmit={mockFn} />);

  const answerInputs = screen.getAllByLabelText('answer input');

  fireEvent.changeText(answerInputs[0], 'a1');
  fireEvent.changeText(answerInputs[1], 'a2');
  fireEvent.press(screen.getByText('Submit'));

  expect(mockFn).toBeCalledWith({
    '1': { q: 'q1', a: 'a1' },
    '2': { q: 'q2', a: 'a2' },
  });
});

*/
