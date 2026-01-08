import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { AdyenCSEWrapper } from '../AdyenCSEModuleWrapper';

/** Mock CSENativeModule */
function createMockCSEModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    encryptCard: jest.fn<() => Promise<any>>().mockResolvedValue({
      encryptedCardNumber: 'adyenjs_...',
      encryptedExpiryMonth: 'adyenjs_...',
      encryptedExpiryYear: 'adyenjs_...',
      encryptedSecurityCode: 'adyenjs_...',
    }),
    encryptBin: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('adyenjs_bin_...'),
  } as any;
}

describe('AdyenCSEModuleWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockCSEModule>;

  beforeEach(() => {
    mockNativeModule = createMockCSEModule();
  });

  describe('encryptCard', () => {
    test('should call native module encryptCard with card and public key', async () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const card = {
        number: '4111111111111111',
        expiryMonth: '03',
        expiryYear: '2030',
        cvv: '737',
      };
      const publicKey = 'test_public_key';

      await wrapper.encryptCard(card, publicKey);

      expect(mockNativeModule.encryptCard).toHaveBeenCalledWith(
        card,
        publicKey
      );
    });

    test('should return encrypted card data', async () => {
      const expectedResult = {
        encryptedCardNumber: 'adyenjs_card_number',
        encryptedExpiryMonth: 'adyenjs_expiry_month',
        encryptedExpiryYear: 'adyenjs_expiry_year',
        encryptedSecurityCode: 'adyenjs_cvc',
      };
      mockNativeModule.encryptCard.mockResolvedValue(expectedResult);

      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const result = await wrapper.encryptCard(
        {
          number: '4111111111111111',
          expiryMonth: '03',
          expiryYear: '2030',
          cvv: '737',
        },
        'public_key'
      );

      expect(result).toEqual(expectedResult);
    });

    test('should encrypt card without CVC', async () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const card = {
        number: '5500000000000004',
        expiryMonth: '12',
        expiryYear: '2025',
      };

      await wrapper.encryptCard(card as any, 'key');

      expect(mockNativeModule.encryptCard).toHaveBeenCalledWith(card, 'key');
    });

    test('should propagate errors from native module', async () => {
      const error = new Error('Encryption failed');
      mockNativeModule.encryptCard.mockRejectedValue(error);

      const wrapper = new AdyenCSEWrapper(mockNativeModule);

      await expect(
        wrapper.encryptCard(
          { number: '1234', expiryMonth: '01', expiryYear: '2020', cvv: '123' },
          'key'
        )
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('encryptBin', () => {
    test('should call native module encryptBin with BIN and public key', async () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const bin = '411111';
      const publicKey = 'test_public_key';

      await wrapper.encryptBin(bin, publicKey);

      expect(mockNativeModule.encryptBin).toHaveBeenCalledWith(bin, publicKey);
    });

    test('should return encrypted BIN', async () => {
      mockNativeModule.encryptBin.mockResolvedValue('adyenjs_encrypted_bin');

      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const result = await wrapper.encryptBin('550000', 'public_key');

      expect(result).toBe('adyenjs_encrypted_bin');
    });

    test('should handle longer BIN (8 digits)', async () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      const bin = '41111111';

      await wrapper.encryptBin(bin, 'key');

      expect(mockNativeModule.encryptBin).toHaveBeenCalledWith(bin, 'key');
    });

    test('should propagate errors from native module', async () => {
      const error = new Error('BIN encryption failed');
      mockNativeModule.encryptBin.mockRejectedValue(error);

      const wrapper = new AdyenCSEWrapper(mockNativeModule);

      await expect(wrapper.encryptBin('123456', 'key')).rejects.toThrow(
        'BIN encryption failed'
      );
    });
  });

  describe('AdyenCSEModule interface', () => {
    test('should implement encryptCard method', () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      expect(typeof wrapper.encryptCard).toBe('function');
    });

    test('should implement encryptBin method', () => {
      const wrapper = new AdyenCSEWrapper(mockNativeModule);
      expect(typeof wrapper.encryptBin).toBe('function');
    });
  });
});
