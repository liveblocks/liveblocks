import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Delete from '../../assets/svg/Delete';

const Todo = ({ onDelete, text }) => {
    return (
      <View style={styles.container}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex:1,
          }}>
          <Text style={styles.todoText}>{text}</Text>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Delete />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    todoText: {
      fontSize: 16,
      fontWeight: '400',
      color: '#1F242B',
      flexWrap: 'wrap',
      width: '85%',
      lineHeight: 22
    },
    container: {
        marginHorizontal: '5%',
        paddingVertical: 12,
        paddingRight: 3,
        borderBottomWidth: 1,
        borderColor: '#E9EDF2',
    },
    deleteButton: {
        marginLeft: 20 
    }
  });

  export default Todo;