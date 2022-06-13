
import React from 'react';
import {
    StyleSheet,
    View,
    Text
} from 'react-native';

import { BlueAvatar, PurpleAvatar, GreenAvatar } from '../../assets/svg/Avatars';

const OneAvatar = () => {
    return <BlueAvatar />
}

const TwoAvatar = () => {
    return (
        <View style={{ flexDirection: 'row' }}>
            <OneAvatar />
            <View style={{ marginLeft: -11 }}>
                <PurpleAvatar />
            </View>
        </View>)
}

const ThreeAvatar = () => {
    return (
        <View style={{ flexDirection: 'row' }}>
            <TwoAvatar />
            <View style={{ marginLeft: -11 }}>
                <GreenAvatar />
            </View>
        </View>);
}

const Avatars = ({ count }) => {
    if (count === 1) {
        return <OneAvatar></OneAvatar>
    }
    if (count === 2) {
        return <TwoAvatar></TwoAvatar>
    }
    if (count >= 3) {
        return <ThreeAvatar></ThreeAvatar>
    }
    return <></>
}

const WhoIsHere = ({ count }) => {
    if (count === 'undefined' || count === 0) {
        return <></>
    }

    return (
        <View style={styles.container}>
            <Text style={styles.countText}>{count}</Text>
            <Avatars count={count} />
        </View>);
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
    },
    countText: {
        fontWeight: '700',
        fontSize: 16,
        marginRight: 8,
        color: '#1F242B'
    },
});

export default WhoIsHere;