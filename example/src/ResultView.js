import React from 'react';
import { View, Text } from "react-native"

const Result = ({ route }) => {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center' }}>
                {route.params.result}
            </Text>
        </View>
    )
}

export default Result;
