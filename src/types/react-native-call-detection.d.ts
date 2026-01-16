declare module 'react-native-call-detection' {
  export default class CallDetectorManager {
    constructor(
      callback: (event: string, phoneNumber: string) => void,
      readPhoneNumberAndroid?: boolean,
      permissionDeniedCallback?: () => void,
      options?: {
        title: string;
        message: string;
      },
    );
    dispose(): void;
  }
}
